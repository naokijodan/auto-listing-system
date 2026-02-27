// @ts-nocheck
/**
 * eBay評価分析・改善API
 * Phase 126: フィードバック分析、AI改善提案、トレンド分析
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@rakuda/database';
import OpenAI from 'openai';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// フィードバックカテゴリ
const FEEDBACK_CATEGORIES = [
  { category: 'SHIPPING', name: '配送', keywords: ['shipping', 'delivery', 'arrived', 'fast', 'slow', 'late', 'quick'] },
  { category: 'PRODUCT_QUALITY', name: '商品品質', keywords: ['quality', 'condition', 'broken', 'damaged', 'perfect', 'excellent', 'defective'] },
  { category: 'DESCRIPTION', name: '商品説明', keywords: ['description', 'as described', 'different', 'accurate', 'misleading', 'photos'] },
  { category: 'COMMUNICATION', name: 'コミュニケーション', keywords: ['communication', 'response', 'helpful', 'responsive', 'ignored', 'rude'] },
  { category: 'PACKAGING', name: '梱包', keywords: ['packaging', 'packed', 'wrapped', 'box', 'protection'] },
  { category: 'VALUE', name: '価格', keywords: ['price', 'value', 'worth', 'expensive', 'cheap', 'deal', 'bargain'] },
  { category: 'RETURN', name: '返品対応', keywords: ['return', 'refund', 'exchange', 'hassle'] },
];

// 改善優先度
const IMPROVEMENT_PRIORITIES = [
  { priority: 'CRITICAL', name: '緊急', color: 'red', impact: '売上に即座に影響' },
  { priority: 'HIGH', name: '高', color: 'orange', impact: '1週間以内に対応推奨' },
  { priority: 'MEDIUM', name: '中', color: 'yellow', impact: '1ヶ月以内に改善' },
  { priority: 'LOW', name: '低', color: 'green', impact: '余裕があれば対応' },
];

// ダッシュボード
router.get('/dashboard', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // フィードバック取得
    const feedback = await (prisma as any).feedback.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        order: {
          select: {
            id: true,
            buyerUsername: true,
          },
        },
      },
    });

    // 基本統計
    const totalFeedback = feedback.length;
    const positiveFeedback = feedback.filter((f: any) => f.rating === 'POSITIVE').length;
    const neutralFeedback = feedback.filter((f: any) => f.rating === 'NEUTRAL').length;
    const negativeFeedback = feedback.filter((f: any) => f.rating === 'NEGATIVE').length;

    const positiveRate = totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 100;

    // 未対応ネガティブ
    const unrespondedNegative = feedback.filter((f: any) =>
      (f.rating === 'NEGATIVE' || f.rating === 'NEUTRAL') &&
      f.direction === 'RECEIVED' &&
      !f.response
    );

    // 週別トレンド
    const weeklyTrend = calculateWeeklyTrend(feedback);

    // カテゴリ別分析
    const categoryAnalysis = analyzeByCategory(feedback);

    // スコア予測
    const scoreForecast = forecastScore(feedback, positiveRate);

    // 改善提案
    const improvements = generateImprovementSuggestions(feedback, categoryAnalysis);

    res.json({
      stats: {
        totalFeedback,
        positiveFeedback,
        neutralFeedback,
        negativeFeedback,
        positiveRate: positiveRate.toFixed(1),
        unrespondedCount: unrespondedNegative.length,
        averageResponseTime: calculateAverageResponseTime(feedback),
      },
      weeklyTrend,
      categoryAnalysis,
      scoreForecast,
      improvements: improvements.slice(0, 5),
      urgentActions: unrespondedNegative.slice(0, 5).map((f: any) => ({
        id: f.id,
        rating: f.rating,
        comment: f.comment,
        buyerUsername: f.order?.buyerUsername,
        createdAt: f.createdAt,
        daysSinceReceived: Math.floor((Date.now() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// カテゴリ一覧
router.get('/categories', async (req, res) => {
  res.json({ categories: FEEDBACK_CATEGORIES });
});

// 優先度一覧
router.get('/priorities', async (req, res) => {
  res.json({ priorities: IMPROVEMENT_PRIORITIES });
});

// トレンド分析
router.get('/trends', async (req, res) => {
  try {
    const { period = '90' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const feedback = await (prisma as any).feedback.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 日別トレンド
    const dailyTrend: Record<string, { positive: number; neutral: number; negative: number; total: number }> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyTrend[dateStr] = { positive: 0, neutral: 0, negative: 0, total: 0 };
    }

    feedback.forEach((f: any) => {
      const dateStr = new Date(f.createdAt).toISOString().split('T')[0];
      if (dailyTrend[dateStr]) {
        dailyTrend[dateStr].total++;
        if (f.rating === 'POSITIVE') dailyTrend[dateStr].positive++;
        else if (f.rating === 'NEUTRAL') dailyTrend[dateStr].neutral++;
        else if (f.rating === 'NEGATIVE') dailyTrend[dateStr].negative++;
      }
    });

    // 週別集計
    const weeklyData = Object.entries(dailyTrend)
      .sort(([a]: any, [b]: any) => a.localeCompare(b))
      .reduce((acc: any, [date, data]: any, idx: any) => {
        const weekIdx = Math.floor(idx / 7);
        if (!acc[weekIdx]) {
          acc[weekIdx] = { weekStart: date, positive: 0, neutral: 0, negative: 0, total: 0 };
        }
        acc[weekIdx].positive += data.positive;
        acc[weekIdx].neutral += data.neutral;
        acc[weekIdx].negative += data.negative;
        acc[weekIdx].total += data.total;
        return acc;
      }, [] as Array<{ weekStart: string; positive: number; neutral: number; negative: number; total: number }>);

    // ポジティブ率の変化
    const positiveRateTrend = weeklyData.map((w: any) => ({
      weekStart: w.weekStart,
      rate: w.total > 0 ? ((w.positive / w.total) * 100).toFixed(1) : '100',
      total: w.total,
    }));

    // 傾向判定
    const recentRate = parseFloat(positiveRateTrend[positiveRateTrend.length - 1]?.rate || '100');
    const previousRate = parseFloat(positiveRateTrend[positiveRateTrend.length - 2]?.rate || '100');
    const trend = recentRate > previousRate ? 'IMPROVING' : recentRate < previousRate ? 'DECLINING' : 'STABLE';

    res.json({
      period: days,
      dailyTrend: Object.entries(dailyTrend)
        .map(([date, data]: any) => ({ date, ...data }))
        .sort((a: any, b: any) => a.date.localeCompare(b.date)),
      weeklyData,
      positiveRateTrend,
      trend,
      summary: {
        totalFeedback: feedback.length,
        averagePositiveRate: (feedback.filter((f: any) => f.rating === 'POSITIVE').length / Math.max(feedback.length, 1) * 100).toFixed(1),
      },
    });
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// カテゴリ別分析
router.get('/by-category', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const feedback = await (prisma as any).feedback.findMany({
      where: {
        createdAt: { gte: startDate },
        comment: { not: null },
      },
    });

    const categoryAnalysis = analyzeByCategory(feedback);

    // 問題カテゴリを特定
    const problemCategories = categoryAnalysis
      .filter((c: any) => c.negativeCount > 0)
      .sort((a: any, b: any) => b.negativeCount - a.negativeCount);

    // 強みカテゴリを特定
    const strengthCategories = categoryAnalysis
      .filter((c: any) => c.positiveCount > c.negativeCount)
      .sort((a: any, b: any) => (b.positiveCount - b.negativeCount) - (a.positiveCount - a.negativeCount));

    res.json({
      period: days,
      categories: categoryAnalysis,
      problemAreas: problemCategories.slice(0, 3),
      strengths: strengthCategories.slice(0, 3),
      recommendations: problemCategories.slice(0, 3).map((c: any) => ({
        category: c.category,
        categoryName: c.name,
        issue: `${c.name}に関するネガティブフィードバックが${c.negativeCount}件あります`,
        suggestion: getCategorySuggestion(c.category),
      })),
    });
  } catch (error) {
    console.error('Category analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze by category' });
  }
});

// センチメント分析
router.get('/sentiment', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const feedback = await (prisma as any).feedback.findMany({
      where: {
        createdAt: { gte: startDate },
        comment: { not: null },
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    // 簡易センチメント分析
    const sentimentResults = feedback.map((f: any) => {
      const sentiment = analyzeSentiment(f.comment || '');
      return {
        id: f.id,
        rating: f.rating,
        comment: f.comment,
        sentiment: sentiment.sentiment,
        score: sentiment.score,
        keywords: sentiment.keywords,
        createdAt: f.createdAt,
      };
    });

    // センチメント分布
    const distribution = {
      veryPositive: sentimentResults.filter((r: any) => r.score > 0.5).length,
      positive: sentimentResults.filter((r: any) => r.score > 0 && r.score <= 0.5).length,
      neutral: sentimentResults.filter((r: any) => r.score === 0).length,
      negative: sentimentResults.filter((r: any) => r.score < 0 && r.score >= -0.5).length,
      veryNegative: sentimentResults.filter((r: any) => r.score < -0.5).length,
    };

    // よく使われるキーワード
    const allKeywords = sentimentResults.flatMap((r: any) => r.keywords);
    const keywordCounts = allKeywords.reduce((acc: any, kw: any) => {
      acc[kw] = (acc[kw] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topKeywords = Object.entries(keywordCounts)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 20)
      .map(([keyword, count]: any) => ({ keyword, count }));

    res.json({
      period: days,
      totalAnalyzed: sentimentResults.length,
      distribution,
      averageSentiment: sentimentResults.length > 0
        ? (sentimentResults.reduce((sum: any, r: any) => sum + r.score, 0) / sentimentResults.length).toFixed(2)
        : '0',
      topKeywords,
      recentSentiments: sentimentResults.slice(0, 10),
    });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

// AI応答提案生成スキーマ
const generateResponseSchema = z.object({
  feedbackId: z.string(),
  comment: z.string(),
  rating: z.string(),
  orderId: z.string().optional(),
  tone: z.enum(['apologetic', 'professional', 'friendly']).default('professional'),
});

// AI応答提案生成
router.post('/generate-response', async (req, res) => {
  try {
    const data = generateResponseSchema.parse(req.body);

    const systemPrompt = `You are a professional eBay seller responding to customer feedback.
Your goal is to maintain a positive seller reputation and resolve any issues.

Guidelines for ${data.rating} feedback response:
${data.rating === 'NEGATIVE' ? `
- Apologize sincerely for the issue
- Acknowledge the customer's frustration
- Offer a solution or compensation
- Request the customer to contact you to resolve the issue
- Be professional but empathetic
` : data.rating === 'NEUTRAL' ? `
- Thank the customer for their feedback
- Address any concerns mentioned
- Offer assistance if needed
- Encourage future purchases
` : `
- Thank the customer warmly
- Express appreciation for their business
- Invite them to shop again
`}

Tone: ${data.tone}
Keep the response under 500 characters (eBay limit).
Write in English.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Customer feedback (${data.rating}):\n"${data.comment}"\n\nGenerate an appropriate response:` },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const generatedResponse = completion.choices[0]?.message?.content || '';

    // 応答分析
    const responseAnalysis = {
      characterCount: generatedResponse.length,
      withinLimit: generatedResponse.length <= 500,
      tone: data.tone,
      hasApology: /sorry|apologize|regret/i.test(generatedResponse),
      hasSolution: /refund|replace|contact|resolve/i.test(generatedResponse),
    };

    res.json({
      success: true,
      feedbackId: data.feedbackId,
      suggestedResponse: generatedResponse,
      analysis: responseAnalysis,
      alternatives: [
        {
          tone: 'apologetic',
          preview: data.tone !== 'apologetic' ? 'より謝罪的なトーンで生成可能' : null,
        },
        {
          tone: 'professional',
          preview: data.tone !== 'professional' ? 'よりプロフェッショナルなトーンで生成可能' : null,
        },
      ],
    });
  } catch (error) {
    console.error('Generate response error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// 改善提案取得
router.get('/improvements', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const feedback = await (prisma as any).feedback.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const categoryAnalysis = analyzeByCategory(feedback);
    const improvements = generateImprovementSuggestions(feedback, categoryAnalysis);

    // 優先度別にグループ化
    const byPriority = IMPROVEMENT_PRIORITIES.map((p: any) => ({
      ...p,
      items: improvements.filter((i: any) => i.priority === p.priority),
    }));

    res.json({
      totalImprovements: improvements.length,
      byPriority,
      topImprovements: improvements.slice(0, 10),
      quickWins: improvements.filter((i: any) => i.effort === 'LOW').slice(0, 5),
    });
  } catch (error) {
    console.error('Improvements error:', error);
    res.status(500).json({ error: 'Failed to fetch improvements' });
  }
});

// スコア予測
router.get('/forecast', async (req, res) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const feedback = await (prisma as any).feedback.findMany({
      where: {
        createdAt: { gte: ninetyDaysAgo },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalFeedback = feedback.length;
    const positiveFeedback = feedback.filter((f: any) => f.rating === 'POSITIVE').length;
    const currentRate = totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 100;

    const forecast = forecastScore(feedback, currentRate);

    // 目標達成に必要なフィードバック数を計算
    const targetRate = 99.5;
    const neededPositive = Math.ceil(
      (targetRate * totalFeedback - positiveFeedback * 100) / (100 - targetRate)
    );

    res.json({
      currentStats: {
        totalFeedback,
        positiveFeedback,
        currentRate: currentRate.toFixed(1),
      },
      forecast,
      targetAnalysis: {
        targetRate: `${targetRate}%`,
        currentGap: (targetRate - currentRate).toFixed(1),
        neededConsecutivePositive: Math.max(0, neededPositive),
      },
      recommendations: [
        {
          action: '未対応のネガティブフィードバックに返信する',
          impact: '評価改善の可能性あり',
          priority: 'HIGH',
        },
        {
          action: '商品説明を詳細化する',
          impact: '「商品と異なる」クレームを減少',
          priority: 'MEDIUM',
        },
        {
          action: '発送を迅速化する',
          impact: '配送関連のネガティブを減少',
          priority: 'MEDIUM',
        },
      ],
    });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Failed to forecast' });
  }
});

// 競合比較（モック）
router.get('/benchmark', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const feedback = await (prisma as any).feedback.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const totalFeedback = feedback.length;
    const positiveFeedback = feedback.filter((f: any) => f.rating === 'POSITIVE').length;
    const currentRate = totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 100;

    // 業界平均（モック）
    const industryBenchmarks = {
      averagePositiveRate: 98.5,
      topSellerRate: 99.8,
      responseRate: 95,
      avgResponseTime: 4, // hours
    };

    res.json({
      yourStats: {
        positiveRate: currentRate.toFixed(1),
        totalFeedback,
        responseRate: calculateResponseRate(feedback),
      },
      industryBenchmarks,
      comparison: {
        positiveRateVsAverage: (currentRate - industryBenchmarks.averagePositiveRate).toFixed(1),
        positiveRateVsTop: (currentRate - industryBenchmarks.topSellerRate).toFixed(1),
        performance: currentRate >= industryBenchmarks.topSellerRate ? 'TOP_PERFORMER'
          : currentRate >= industryBenchmarks.averagePositiveRate ? 'ABOVE_AVERAGE'
          : 'BELOW_AVERAGE',
      },
      recommendations: currentRate < industryBenchmarks.averagePositiveRate ? [
        '業界平均を下回っています。ネガティブフィードバックの原因を分析してください。',
        '返品ポリシーを見直してください。',
        '商品写真と説明の精度を向上させてください。',
      ] : currentRate < industryBenchmarks.topSellerRate ? [
        '業界平均を上回っていますが、トップセラーレベルにはまだ改善の余地があります。',
        '発送速度を向上させることで評価が改善する可能性があります。',
      ] : [
        'トップパフォーマーレベルを維持しています。素晴らしい結果です！',
        '現在の品質基準を維持してください。',
      ],
    });
  } catch (error) {
    console.error('Benchmark error:', error);
    res.status(500).json({ error: 'Failed to fetch benchmark' });
  }
});

// 統計サマリー
router.get('/stats', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const feedback = await (prisma as any).feedback.findMany({
      where: {
        createdAt: { gte: startDate },
      },
    });

    const totalFeedback = feedback.length;
    const receivedFeedback = feedback.filter((f: any) => f.direction === 'RECEIVED');
    const givenFeedback = feedback.filter((f: any) => f.direction === 'GIVEN');

    const positiveReceived = receivedFeedback.filter((f: any) => f.rating === 'POSITIVE').length;
    const positiveGiven = givenFeedback.filter((f: any) => f.rating === 'POSITIVE').length;

    const respondedFeedback = receivedFeedback.filter((f: any) => f.response);

    res.json({
      period: days,
      overview: {
        totalFeedback,
        receivedCount: receivedFeedback.length,
        givenCount: givenFeedback.length,
      },
      received: {
        total: receivedFeedback.length,
        positive: positiveReceived,
        neutral: receivedFeedback.filter((f: any) => f.rating === 'NEUTRAL').length,
        negative: receivedFeedback.filter((f: any) => f.rating === 'NEGATIVE').length,
        positiveRate: receivedFeedback.length > 0
          ? ((positiveReceived / receivedFeedback.length) * 100).toFixed(1)
          : '100',
      },
      given: {
        total: givenFeedback.length,
        positive: positiveGiven,
        neutral: givenFeedback.filter((f: any) => f.rating === 'NEUTRAL').length,
        negative: givenFeedback.filter((f: any) => f.rating === 'NEGATIVE').length,
      },
      response: {
        respondedCount: respondedFeedback.length,
        unrespondedCount: receivedFeedback.length - respondedFeedback.length,
        responseRate: receivedFeedback.length > 0
          ? ((respondedFeedback.length / receivedFeedback.length) * 100).toFixed(1)
          : '100',
        avgResponseTime: calculateAverageResponseTime(receivedFeedback),
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ヘルパー関数

function calculateWeeklyTrend(feedback: any[]): Array<{ week: string; positive: number; neutral: number; negative: number; rate: string }> {
  const weeks: Record<string, { positive: number; neutral: number; negative: number }> = {};

  feedback.forEach((f: any) => {
    const date = new Date(f.createdAt);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weeks[weekKey]) {
      weeks[weekKey] = { positive: 0, neutral: 0, negative: 0 };
    }

    if (f.rating === 'POSITIVE') weeks[weekKey].positive++;
    else if (f.rating === 'NEUTRAL') weeks[weekKey].neutral++;
    else if (f.rating === 'NEGATIVE') weeks[weekKey].negative++;
  });

  return Object.entries(weeks)
    .sort(([a]: any, [b]: any) => a.localeCompare(b))
    .slice(-4)
    .map(([week, data]: any) => {
      const total = data.positive + data.neutral + data.negative;
      return {
        week,
        ...data,
        rate: total > 0 ? ((data.positive / total) * 100).toFixed(1) : '100',
      };
    });
}

function analyzeByCategory(feedback: any[]): Array<{
  category: string;
  name: string;
  positiveCount: number;
  negativeCount: number;
  total: number;
  sentiment: string;
}> {
  return FEEDBACK_CATEGORIES.map((cat: any) => {
    const matchingFeedback = feedback.filter((f: any) => {
      const comment = (f.comment || '').toLowerCase();
      return cat.keywords.some((kw: any) => comment.includes(kw));
    });

    const positiveCount = matchingFeedback.filter((f: any) => f.rating === 'POSITIVE').length;
    const negativeCount = matchingFeedback.filter((f: any) => f.rating === 'NEGATIVE' || f.rating === 'NEUTRAL').length;

    return {
      category: cat.category,
      name: cat.name,
      positiveCount,
      negativeCount,
      total: matchingFeedback.length,
      sentiment: positiveCount > negativeCount ? 'POSITIVE' : negativeCount > positiveCount ? 'NEGATIVE' : 'NEUTRAL',
    };
  }).filter((c: any) => c.total > 0);
}

function forecastScore(feedback: any[], currentRate: number): {
  next30Days: string;
  next90Days: string;
  trend: string;
  confidence: string;
} {
  // 簡易予測（直近のトレンドベース）
  const recentFeedback = feedback.slice(-30);
  const recentPositive = recentFeedback.filter((f: any) => f.rating === 'POSITIVE').length;
  const recentRate = recentFeedback.length > 0 ? (recentPositive / recentFeedback.length) * 100 : currentRate;

  const trend = recentRate > currentRate ? 'IMPROVING' : recentRate < currentRate ? 'DECLINING' : 'STABLE';
  const delta = recentRate - currentRate;

  return {
    next30Days: Math.min(100, Math.max(0, currentRate + delta * 0.5)).toFixed(1),
    next90Days: Math.min(100, Math.max(0, currentRate + delta * 1.5)).toFixed(1),
    trend,
    confidence: recentFeedback.length >= 10 ? 'HIGH' : recentFeedback.length >= 5 ? 'MEDIUM' : 'LOW',
  };
}

function generateImprovementSuggestions(feedback: any[], categoryAnalysis: any[]): Array<{
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  effort: string;
  expectedImpact: string;
}> {
  const suggestions: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    effort: string;
    expectedImpact: string;
  }> = [];

  // カテゴリ別問題に基づく提案
  categoryAnalysis
    .filter((c: any) => c.negativeCount > 0)
    .forEach((c: any) => {
      suggestions.push({
        id: `imp_${c.category}`,
        title: `${c.name}の改善`,
        description: getCategorySuggestion(c.category),
        category: c.category,
        priority: c.negativeCount >= 5 ? 'HIGH' : c.negativeCount >= 2 ? 'MEDIUM' : 'LOW',
        effort: getEffortLevel(c.category),
        expectedImpact: `ネガティブフィードバック${c.negativeCount}件の削減可能性`,
      });
    });

  // 未対応フィードバック
  const unresponded = feedback.filter((f: any) =>
    (f.rating === 'NEGATIVE' || f.rating === 'NEUTRAL') &&
    f.direction === 'RECEIVED' &&
    !f.response
  );
  if (unresponded.length > 0) {
    suggestions.unshift({
      id: 'imp_respond',
      title: '未対応フィードバックへの返信',
      description: `${unresponded.length}件のネガティブ/ニュートラルフィードバックが未対応です。迅速に対応することで評価改善の可能性があります。`,
      category: 'COMMUNICATION',
      priority: 'CRITICAL',
      effort: 'LOW',
      expectedImpact: '評価修正リクエストにつながる可能性',
    });
  }

  return suggestions.sort((a: any, b: any) => {
    const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function getCategorySuggestion(category: string): string {
  const suggestions: Record<string, string> = {
    SHIPPING: '発送時間を短縮し、追跡番号を迅速に提供してください。発送遅延が予想される場合は事前に連絡しましょう。',
    PRODUCT_QUALITY: '商品の検品プロセスを強化してください。発送前に商品状態を写真で記録することをお勧めします。',
    DESCRIPTION: '商品説明をより詳細にし、実際の商品写真を複数枚掲載してください。サイズや状態について明確に記載しましょう。',
    COMMUNICATION: 'メッセージへの返信時間を短縮してください。自動応答を活用して初期対応を迅速化することも効果的です。',
    PACKAGING: '梱包材を改善し、破損防止対策を強化してください。壊れやすい商品には特別な注意を払いましょう。',
    VALUE: '価格設定を見直し、競合との比較を行ってください。送料を含めた総額で競争力を確認しましょう。',
    RETURN: '返品ポリシーを明確にし、返品プロセスを簡素化してください。迅速な返金対応が重要です。',
  };
  return suggestions[category] || '詳細な分析が必要です。';
}

function getEffortLevel(category: string): string {
  const effortLevels: Record<string, string> = {
    SHIPPING: 'MEDIUM',
    PRODUCT_QUALITY: 'HIGH',
    DESCRIPTION: 'LOW',
    COMMUNICATION: 'LOW',
    PACKAGING: 'MEDIUM',
    VALUE: 'MEDIUM',
    RETURN: 'LOW',
  };
  return effortLevels[category] || 'MEDIUM';
}

function analyzeSentiment(text: string): { sentiment: string; score: number; keywords: string[] } {
  const lowerText = text.toLowerCase();

  const positiveWords = ['great', 'excellent', 'perfect', 'amazing', 'fast', 'quick', 'love', 'recommend', 'best', 'wonderful', 'fantastic', 'awesome', 'happy', 'satisfied', 'thank'];
  const negativeWords = ['bad', 'terrible', 'awful', 'slow', 'damaged', 'broken', 'wrong', 'never', 'worst', 'disappointed', 'frustrated', 'angry', 'refund', 'scam', 'fake'];

  const foundPositive = positiveWords.filter((w: any) => lowerText.includes(w));
  const foundNegative = negativeWords.filter((w: any) => lowerText.includes(w));

  const score = (foundPositive.length - foundNegative.length) / Math.max(1, foundPositive.length + foundNegative.length);

  return {
    sentiment: score > 0.2 ? 'POSITIVE' : score < -0.2 ? 'NEGATIVE' : 'NEUTRAL',
    score: Math.round(score * 100) / 100,
    keywords: [...foundPositive, ...foundNegative],
  };
}

function calculateAverageResponseTime(feedback: any[]): string {
  const respondedFeedback = feedback.filter((f: any) => f.response && f.respondedAt && f.createdAt);
  if (respondedFeedback.length === 0) return 'N/A';

  const totalHours = respondedFeedback.reduce((sum: any, f: any) => {
    const hours = (new Date(f.respondedAt).getTime() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);

  const avgHours = totalHours / respondedFeedback.length;
  if (avgHours < 1) return `${Math.round(avgHours * 60)}分`;
  if (avgHours < 24) return `${avgHours.toFixed(1)}時間`;
  return `${(avgHours / 24).toFixed(1)}日`;
}

function calculateResponseRate(feedback: any[]): string {
  const received = feedback.filter((f: any) => f.direction === 'RECEIVED');
  if (received.length === 0) return '100';
  const responded = received.filter((f: any) => f.response);
  return ((responded.length / received.length) * 100).toFixed(1);
}

export { router as ebayFeedbackAnalysisRouter };

/**
 * Phase 36: AI機能強化 API
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type {
  AiModelType,
  AiProvider,
  Marketplace,
  DemandForecastTarget,
  ForecastPeriod,
  RecommendationType,
  PriceOptimizationTarget,
  PriceOptimizationStrategy,
  PriceOptimizationMetric,
  AiTrainingJobType,
} from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ========================================
// AIモデル管理
// ========================================

/**
 * AIモデル一覧
 */
router.get('/models', async (req: Request, res: Response) => {
  try {
    const {
      modelType,
      provider,
      isActive,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (modelType) where.modelType = modelType as AiModelType;
    if (provider) where.provider = provider as AiProvider;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [models, total] = await Promise.all([
      prisma.aiModel.findMany({
        where,
        orderBy: [{ isLatest: 'desc' }, { createdAt: 'desc' }],
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.aiModel.count({ where }),
    ]);

    res.json({ models, total });
  } catch (error) {
    console.error('Failed to list AI models:', error);
    res.status(500).json({ error: 'Failed to list AI models' });
  }
});

/**
 * AIモデル取得
 */
router.get('/models/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const model = await prisma.aiModel.findUnique({
      where: { id },
      include: {
        predictions: {
          orderBy: { requestedAt: 'desc' },
          take: 10,
        },
        trainingJobs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!model) {
      return res.status(404).json({ error: 'AI model not found' });
    }

    res.json(model);
  } catch (error) {
    console.error('Failed to get AI model:', error);
    res.status(500).json({ error: 'Failed to get AI model' });
  }
});

/**
 * AIモデル作成
 */
router.post('/models', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      modelType,
      provider,
      modelId,
      apiEndpoint,
      config,
      systemPrompt,
      promptTemplate,
      version,
    } = req.body;

    const model = await prisma.aiModel.create({
      data: {
        name,
        description,
        modelType: modelType as AiModelType,
        provider: (provider as AiProvider) ?? 'OPENAI',
        modelId,
        apiEndpoint,
        config: config ?? {},
        systemPrompt,
        promptTemplate,
        version: version ?? '1.0',
        isLatest: true,
        isActive: true,
      },
    });

    // 同じタイプの他のモデルのisLatestをfalseに
    await prisma.aiModel.updateMany({
      where: {
        modelType: modelType as AiModelType,
        id: { not: model.id },
      },
      data: { isLatest: false },
    });

    res.status(201).json(model);
  } catch (error) {
    console.error('Failed to create AI model:', error);
    res.status(500).json({ error: 'Failed to create AI model' });
  }
});

/**
 * AIモデル更新
 */
router.patch('/models/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      config,
      systemPrompt,
      promptTemplate,
      isActive,
      isLatest,
    } = req.body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (config !== undefined) data.config = config;
    if (systemPrompt !== undefined) data.systemPrompt = systemPrompt;
    if (promptTemplate !== undefined) data.promptTemplate = promptTemplate;
    if (isActive !== undefined) data.isActive = isActive;
    if (isLatest !== undefined) data.isLatest = isLatest;

    const model = await prisma.aiModel.update({
      where: { id },
      data,
    });

    res.json(model);
  } catch (error) {
    console.error('Failed to update AI model:', error);
    res.status(500).json({ error: 'Failed to update AI model' });
  }
});

// ========================================
// 価格予測
// ========================================

/**
 * 価格予測実行
 */
router.post('/predictions/price', async (req: Request, res: Response) => {
  try {
    const { productId, marketplace, modelId } = req.body;

    if (!productId || !marketplace) {
      return res.status(400).json({ error: 'productId and marketplace are required' });
    }

    // 商品確認
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        listings: {
          where: { marketplace: marketplace as Marketplace },
        },
        competitorPrices: {
          where: { marketplace },
          orderBy: { collectedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // AIモデル取得
    const model = modelId
      ? await prisma.aiModel.findUnique({ where: { id: modelId } })
      : await prisma.aiModel.findFirst({
          where: { modelType: 'PRICE_PREDICTION', isActive: true, isLatest: true },
        });

    // 現在価格
    const listing = product.listings[0];
    const currentPrice = listing?.listingPrice ?? (product.price / 150) * 1.3;

    // 競合分析
    const competitors = product.competitorPrices;
    const competitorPrices = competitors.map((c) => c.totalPrice ?? c.price);
    const avgCompetitorPrice = competitorPrices.length > 0
      ? competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length
      : null;
    const lowestCompetitorPrice = competitorPrices.length > 0
      ? Math.min(...competitorPrices)
      : null;

    // フォールバック価格計算
    let predictedPrice = currentPrice;
    let recommendedAction = 'MAINTAIN';
    let recommendedPrice: number | undefined;

    if (avgCompetitorPrice && lowestCompetitorPrice) {
      const targetPrice = (avgCompetitorPrice + lowestCompetitorPrice) / 2;
      if (currentPrice > targetPrice * 1.1) {
        predictedPrice = targetPrice * 1.05;
        recommendedAction = 'DECREASE';
        recommendedPrice = predictedPrice;
      } else if (currentPrice < targetPrice * 0.9) {
        predictedPrice = targetPrice * 0.95;
        recommendedAction = 'INCREASE';
        recommendedPrice = predictedPrice;
      }
    }

    // 有効期限（24時間後）
    const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 予測結果保存
    const prediction = await prisma.pricePrediction.create({
      data: {
        modelId: model?.id,
        productId,
        marketplace: marketplace as Marketplace,
        currentPrice,
        predictedPrice,
        confidence: model ? 0.7 : 0.5,
        priceRange: {
          min: predictedPrice * 0.9,
          max: predictedPrice * 1.1,
        },
        factors: [
          { name: 'Competitor analysis', weight: 0.4, impact: 'positive' },
          { name: 'Market demand', weight: 0.3, impact: 'neutral' },
          { name: 'Cost margin', weight: 0.3, impact: 'neutral' },
        ],
        reasoning: 'Price prediction based on competitor analysis and market conditions',
        recommendedAction: recommendedAction as 'INCREASE' | 'DECREASE' | 'MAINTAIN' | 'REVIEW',
        recommendedPrice,
        competitorCount: competitors.length,
        averageCompetitorPrice: avgCompetitorPrice,
        lowestCompetitorPrice,
        validUntil,
      },
      include: {
        product: {
          select: { id: true, title: true, titleEn: true },
        },
      },
    });

    res.status(201).json(prediction);
  } catch (error) {
    console.error('Failed to predict price:', error);
    res.status(500).json({ error: 'Failed to predict price' });
  }
});

/**
 * 商品の価格予測一覧
 */
router.get('/predictions/price/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { marketplace, limit = '10' } = req.query;

    const where: Record<string, unknown> = { productId };
    if (marketplace) where.marketplace = marketplace as Marketplace;

    const predictions = await prisma.pricePrediction.findMany({
      where,
      orderBy: { predictedAt: 'desc' },
      take: parseInt(limit as string, 10),
    });

    res.json(predictions);
  } catch (error) {
    console.error('Failed to get price predictions:', error);
    res.status(500).json({ error: 'Failed to get price predictions' });
  }
});

// ========================================
// 需要予測
// ========================================

/**
 * 需要予測実行
 */
router.post('/forecasts/demand', async (req: Request, res: Response) => {
  try {
    const {
      targetType,
      targetId,
      targetName,
      marketplace,
      forecastPeriod,
      startDate,
      endDate,
      modelId,
    } = req.body;

    if (!targetType || !forecastPeriod || !startDate || !endDate) {
      return res.status(400).json({
        error: 'targetType, forecastPeriod, startDate, and endDate are required',
      });
    }

    // AIモデル取得
    const model = modelId
      ? await prisma.aiModel.findUnique({ where: { id: modelId } })
      : await prisma.aiModel.findFirst({
          where: { modelType: 'DEMAND_FORECAST', isActive: true, isLatest: true },
        });

    // 過去の販売データ取得（簡易版）
    const pastSales = await prisma.sale.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const avgDailySales = pastSales / 90;
    const periodDays = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000);
    const predictedDemand = Math.round(avgDailySales * periodDays);

    const forecast = await prisma.demandForecast.create({
      data: {
        modelId: model?.id,
        targetType: targetType as DemandForecastTarget,
        targetId,
        targetName,
        marketplace: marketplace as Marketplace | undefined,
        forecastPeriod: forecastPeriod as ForecastPeriod,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        predictedDemand: predictedDemand > 0 ? predictedDemand : 10,
        confidence: model ? 0.7 : 0.5,
        demandRange: {
          min: Math.floor(predictedDemand * 0.8),
          max: Math.ceil(predictedDemand * 1.2),
        },
        trend: 'STABLE',
        trendStrength: 0.5,
        growthRate: 0,
        seasonalIndex: 1,
        isSeasonalPeak: false,
        factors: [
          { name: 'Historical sales', impact: 'Primary factor' },
          { name: 'Seasonal trends', impact: 'Minor adjustment' },
        ],
        recommendedStock: Math.ceil(predictedDemand * 1.2),
        reorderPoint: Math.ceil(predictedDemand * 0.3),
      },
    });

    res.status(201).json(forecast);
  } catch (error) {
    console.error('Failed to forecast demand:', error);
    res.status(500).json({ error: 'Failed to forecast demand' });
  }
});

/**
 * 需要予測一覧
 */
router.get('/forecasts/demand', async (req: Request, res: Response) => {
  try {
    const {
      targetType,
      marketplace,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (targetType) where.targetType = targetType as DemandForecastTarget;
    if (marketplace) where.marketplace = marketplace as Marketplace;

    const [forecasts, total] = await Promise.all([
      prisma.demandForecast.findMany({
        where,
        orderBy: { forecastedAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.demandForecast.count({ where }),
    ]);

    res.json({ forecasts, total });
  } catch (error) {
    console.error('Failed to list demand forecasts:', error);
    res.status(500).json({ error: 'Failed to list demand forecasts' });
  }
});

// ========================================
// 商品推薦
// ========================================

/**
 * 推薦生成
 */
router.post('/recommendations', async (req: Request, res: Response) => {
  try {
    const {
      recommendationType,
      userId,
      sourceProductId,
      category,
      marketplace,
      limit = 10,
      modelId,
    } = req.body;

    if (!recommendationType) {
      return res.status(400).json({ error: 'recommendationType is required' });
    }

    // AIモデル取得
    const model = modelId
      ? await prisma.aiModel.findUnique({ where: { id: modelId } })
      : await prisma.aiModel.findFirst({
          where: { modelType: 'PRODUCT_RECOMMENDATION', isActive: true, isLatest: true },
        });

    // 候補商品取得
    const where: Record<string, unknown> = {
      status: { in: ['ACTIVE', 'APPROVED', 'READY_TO_REVIEW'] },
    };
    if (category) where.category = category;
    if (sourceProductId) where.id = { not: sourceProductId };

    const candidates = await prisma.product.findMany({
      where,
      select: {
        id: true,
        title: true,
        titleEn: true,
        category: true,
        brand: true,
        price: true,
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    // スコアリング（簡易版）
    const scored = candidates.map((product) => {
      let score = 0.5;
      let reason = 'Default score';

      if (category && product.category === category) {
        score += 0.2;
        reason = 'Category match';
      }
      if (product.brand) {
        score += 0.1;
        reason += ', branded';
      }
      if (product.price > 5000) {
        score += 0.1;
        reason += ', premium';
      }

      return {
        productId: product.id,
        score: Math.min(1, score),
        reason,
      };
    });

    // 上位N件
    const topRecommendations = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // 有効期限（24時間後）
    const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const recommendation = await prisma.productRecommendation.create({
      data: {
        modelId: model?.id,
        recommendationType: recommendationType as RecommendationType,
        inputData: { userId, sourceProductId, category, marketplace, limit },
        recommendations: topRecommendations,
        totalCandidates: candidates.length,
        topScore: topRecommendations[0]?.score,
        userId,
        sourceProductId,
        category,
        marketplace: marketplace as Marketplace | undefined,
        validUntil,
      },
    });

    res.status(201).json(recommendation);
  } catch (error) {
    console.error('Failed to generate recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * 推薦一覧
 */
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const {
      recommendationType,
      userId,
      marketplace,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (recommendationType) where.recommendationType = recommendationType as RecommendationType;
    if (userId) where.userId = userId;
    if (marketplace) where.marketplace = marketplace as Marketplace;

    const [recommendations, total] = await Promise.all([
      prisma.productRecommendation.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.productRecommendation.count({ where }),
    ]);

    res.json({ recommendations, total });
  } catch (error) {
    console.error('Failed to list recommendations:', error);
    res.status(500).json({ error: 'Failed to list recommendations' });
  }
});

/**
 * 推薦効果記録
 */
router.post('/recommendations/:id/track', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { event, productId, revenue } = req.body;

    const recommendation = await prisma.productRecommendation.findUnique({
      where: { id },
    });

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    const data: Record<string, unknown> = {};

    switch (event) {
      case 'impression':
        data.impressions = { increment: 1 };
        break;
      case 'click':
        data.clicks = { increment: 1 };
        break;
      case 'conversion':
        data.conversions = { increment: 1 };
        if (revenue) data.revenue = { increment: revenue };
        break;
      case 'delivered':
        data.isDelivered = true;
        data.deliveredAt = new Date();
        break;
    }

    const updated = await prisma.productRecommendation.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to track recommendation:', error);
    res.status(500).json({ error: 'Failed to track recommendation' });
  }
});

// ========================================
// 競合価格
// ========================================

/**
 * 競合価格記録
 */
router.post('/competitor-prices', async (req: Request, res: Response) => {
  try {
    const {
      productId,
      competitorName,
      competitorUrl,
      marketplace,
      matchedTitle,
      matchConfidence,
      price,
      currency,
      shippingCost,
      inStock,
      stockQuantity,
      sellerRating,
      sellerReviews,
      source,
    } = req.body;

    if (!competitorName || !marketplace || price === undefined) {
      return res.status(400).json({
        error: 'competitorName, marketplace, and price are required',
      });
    }

    const totalPrice = shippingCost ? price + shippingCost : price;

    const competitorPrice = await prisma.competitorPrice.create({
      data: {
        productId,
        competitorName,
        competitorUrl,
        marketplace,
        matchedTitle,
        matchConfidence,
        price,
        currency: currency ?? 'USD',
        shippingCost,
        totalPrice,
        inStock: inStock ?? true,
        stockQuantity,
        sellerRating,
        sellerReviews,
        source: source ?? 'manual',
      },
    });

    res.status(201).json(competitorPrice);
  } catch (error) {
    console.error('Failed to record competitor price:', error);
    res.status(500).json({ error: 'Failed to record competitor price' });
  }
});

/**
 * 商品の競合価格一覧
 */
router.get('/competitor-prices/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { marketplace, limit = '50' } = req.query;

    const where: Record<string, unknown> = { productId };
    if (marketplace) where.marketplace = marketplace;

    const prices = await prisma.competitorPrice.findMany({
      where,
      orderBy: { collectedAt: 'desc' },
      take: parseInt(limit as string, 10),
    });

    res.json(prices);
  } catch (error) {
    console.error('Failed to get competitor prices:', error);
    res.status(500).json({ error: 'Failed to get competitor prices' });
  }
});

/**
 * 競合価格統計
 */
router.get('/competitor-prices/:productId/stats', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const prices = await prisma.competitorPrice.findMany({
      where: {
        productId,
        collectedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        inStock: true,
      },
      select: {
        totalPrice: true,
        price: true,
      },
    });

    if (prices.length === 0) {
      return res.json(null);
    }

    const priceValues = prices.map((p) => p.totalPrice ?? p.price);
    const sum = priceValues.reduce((a, b) => a + b, 0);
    const min = Math.min(...priceValues);
    const max = Math.max(...priceValues);

    res.json({
      competitorCount: prices.length,
      averagePrice: sum / prices.length,
      lowestPrice: min,
      highestPrice: max,
      priceRange: max - min,
    });
  } catch (error) {
    console.error('Failed to get competitor price stats:', error);
    res.status(500).json({ error: 'Failed to get competitor price stats' });
  }
});

// ========================================
// 価格最適化
// ========================================

/**
 * 価格最適化設定一覧
 */
router.get('/price-optimizations', async (req: Request, res: Response) => {
  try {
    const {
      targetType,
      marketplace,
      isActive,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (targetType) where.targetType = targetType as PriceOptimizationTarget;
    if (marketplace) where.marketplace = marketplace as Marketplace;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [optimizations, total] = await Promise.all([
      prisma.priceOptimization.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.priceOptimization.count({ where }),
    ]);

    res.json({ optimizations, total });
  } catch (error) {
    console.error('Failed to list price optimizations:', error);
    res.status(500).json({ error: 'Failed to list price optimizations' });
  }
});

/**
 * 価格最適化設定作成
 */
router.post('/price-optimizations', async (req: Request, res: Response) => {
  try {
    const {
      targetType,
      targetId,
      marketplace,
      strategy,
      minPrice,
      maxPrice,
      minMargin,
      maxDiscount,
      targetMetric,
      targetValue,
      rules,
      autoUpdate,
      updateFrequency,
      monitorCompetitors,
      competitorThreshold,
    } = req.body;

    if (!targetType || !strategy) {
      return res.status(400).json({ error: 'targetType and strategy are required' });
    }

    const optimization = await prisma.priceOptimization.create({
      data: {
        targetType: targetType as PriceOptimizationTarget,
        targetId,
        marketplace: marketplace as Marketplace | undefined,
        strategy: strategy as PriceOptimizationStrategy,
        minPrice,
        maxPrice,
        minMargin,
        maxDiscount,
        targetMetric: (targetMetric as PriceOptimizationMetric) ?? 'PROFIT',
        targetValue,
        rules: rules ?? [],
        autoUpdate: autoUpdate ?? false,
        updateFrequency,
        monitorCompetitors: monitorCompetitors ?? true,
        competitorThreshold,
        isActive: true,
      },
    });

    res.status(201).json(optimization);
  } catch (error) {
    console.error('Failed to create price optimization:', error);
    res.status(500).json({ error: 'Failed to create price optimization' });
  }
});

/**
 * 価格最適化実行
 */
router.post('/price-optimizations/:id/optimize', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const optimization = await prisma.priceOptimization.findUnique({
      where: { id },
    });

    if (!optimization || !optimization.isActive) {
      return res.status(404).json({ error: 'Price optimization not found or inactive' });
    }

    // 対象商品取得
    const where: Record<string, unknown> = {
      status: { in: ['ACTIVE', 'APPROVED'] },
    };

    if (optimization.targetType === 'PRODUCT' && optimization.targetId) {
      where.id = optimization.targetId;
    } else if (optimization.targetType === 'CATEGORY' && optimization.targetId) {
      where.category = optimization.targetId;
    } else if (optimization.targetType === 'BRAND' && optimization.targetId) {
      where.brand = optimization.targetId;
    }

    const products = await prisma.product.findMany({
      where,
      select: { id: true, price: true },
      take: 100,
    });

    const priceChanges = [];

    for (const product of products) {
      const listing = await prisma.listing.findFirst({
        where: {
          productId: product.id,
          marketplace: optimization.marketplace ?? undefined,
          status: 'ACTIVE',
        },
      });

      if (!listing) continue;

      // 競合価格取得
      const competitorPrices = await prisma.competitorPrice.findMany({
        where: {
          productId: product.id,
          collectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          inStock: true,
        },
      });

      const priceValues = competitorPrices.map((p) => p.totalPrice ?? p.price);
      const avgPrice = priceValues.length > 0
        ? priceValues.reduce((a, b) => a + b, 0) / priceValues.length
        : null;
      const lowestPrice = priceValues.length > 0
        ? Math.min(...priceValues)
        : null;

      // 最適価格計算
      const exchangeRate = 150;
      const costUsd = product.price / exchangeRate;
      const minMargin = optimization.minMargin ?? 20;
      const minPrice = optimization.minPrice ?? costUsd * (1 + minMargin / 100);
      const maxPrice = optimization.maxPrice ?? costUsd * 3;

      let newPrice = listing.listingPrice;

      if (avgPrice && lowestPrice) {
        switch (optimization.strategy) {
          case 'COMPETITIVE':
            newPrice = lowestPrice * 0.98;
            break;
          case 'PROFIT_MAXIMIZATION':
            newPrice = avgPrice * 1.05;
            break;
          case 'MARKET_PENETRATION':
            newPrice = lowestPrice;
            break;
          case 'DYNAMIC':
            newPrice = lowestPrice + (avgPrice - lowestPrice) * 0.4;
            break;
          default:
            newPrice = avgPrice;
        }
      }

      newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
      newPrice = Math.round(newPrice * 100) / 100;

      if (Math.abs(newPrice - listing.listingPrice) > 0.01) {
        if (optimization.autoUpdate) {
          await prisma.listing.update({
            where: { id: listing.id },
            data: { listingPrice: newPrice },
          });
        }

        priceChanges.push({
          productId: product.id,
          listingId: listing.id,
          oldPrice: listing.listingPrice,
          newPrice,
          applied: optimization.autoUpdate,
        });
      }
    }

    // 統計更新
    await prisma.priceOptimization.update({
      where: { id },
      data: {
        totalOptimizations: { increment: 1 },
        lastUpdatedAt: new Date(),
        averagePriceChange: priceChanges.length > 0
          ? priceChanges.reduce((sum, c) => sum + Math.abs(c.newPrice - c.oldPrice), 0) / priceChanges.length
          : 0,
      },
    });

    res.json({ optimized: priceChanges.length, priceChanges });
  } catch (error) {
    console.error('Failed to optimize prices:', error);
    res.status(500).json({ error: 'Failed to optimize prices' });
  }
});

// ========================================
// AI学習ジョブ
// ========================================

/**
 * 学習ジョブ一覧
 */
router.get('/training-jobs', async (req: Request, res: Response) => {
  try {
    const { modelId, status, limit = '50', offset = '0' } = req.query;

    const where: Record<string, unknown> = {};
    if (modelId) where.modelId = modelId;
    if (status) where.status = status;

    const [jobs, total] = await Promise.all([
      prisma.aiTrainingJob.findMany({
        where,
        include: {
          model: {
            select: { id: true, name: true, modelType: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.aiTrainingJob.count({ where }),
    ]);

    res.json({ jobs, total });
  } catch (error) {
    console.error('Failed to list training jobs:', error);
    res.status(500).json({ error: 'Failed to list training jobs' });
  }
});

/**
 * 学習ジョブ作成
 */
router.post('/training-jobs', async (req: Request, res: Response) => {
  try {
    const {
      modelId,
      jobType,
      name,
      description,
      datasetConfig,
      hyperparameters,
    } = req.body;

    if (!modelId || !jobType || !name) {
      return res.status(400).json({ error: 'modelId, jobType, and name are required' });
    }

    const model = await prisma.aiModel.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      return res.status(404).json({ error: 'AI model not found' });
    }

    const job = await prisma.aiTrainingJob.create({
      data: {
        modelId,
        jobType: jobType as AiTrainingJobType,
        name,
        description,
        datasetConfig: datasetConfig ?? {},
        hyperparameters: hyperparameters ?? {},
        status: 'PENDING',
      },
      include: {
        model: {
          select: { id: true, name: true, modelType: true },
        },
      },
    });

    res.status(201).json(job);
  } catch (error) {
    console.error('Failed to create training job:', error);
    res.status(500).json({ error: 'Failed to create training job' });
  }
});

/**
 * 予測ログ一覧
 */
router.get('/prediction-logs', async (req: Request, res: Response) => {
  try {
    const {
      modelId,
      predictionType,
      status,
      limit = '100',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (modelId) where.modelId = modelId;
    if (predictionType) where.predictionType = predictionType;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      prisma.aiPredictionLog.findMany({
        where,
        include: {
          model: {
            select: { id: true, name: true, modelType: true },
          },
        },
        orderBy: { requestedAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.aiPredictionLog.count({ where }),
    ]);

    res.json({ logs, total });
  } catch (error) {
    console.error('Failed to list prediction logs:', error);
    res.status(500).json({ error: 'Failed to list prediction logs' });
  }
});

export default router;

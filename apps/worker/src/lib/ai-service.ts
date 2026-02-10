/**
 * Phase 36: AI機能強化サービス
 *
 * 機能:
 * - 価格予測・最適化
 * - 需要予測
 * - 商品推薦
 * - 競合価格監視
 */

import { PrismaClient } from '@prisma/client';
import type {
  AiModel,
  PricePrediction,
  DemandForecast,
  ProductRecommendation,
  AiTrainingJob,
  AiPredictionLog,
  PriceOptimization,
  CompetitorPrice,
  AiModelType,
  AiProvider,
  Marketplace,
  PriceRecommendedAction,
  DemandForecastTarget,
  ForecastPeriod,
  DemandTrend,
  RecommendationType,
  AiTrainingJobType,
  AiTrainingStatus,
  AiPredictionType,
  AiPredictionStatus,
  PriceOptimizationTarget,
  PriceOptimizationStrategy,
  PriceOptimizationMetric,
} from '@prisma/client';

const prisma = new PrismaClient();

// ========================================
// 型定義
// ========================================

interface AiModelCreateInput {
  name: string;
  description?: string;
  modelType: AiModelType;
  provider?: AiProvider;
  modelId: string;
  apiEndpoint?: string;
  config?: Record<string, unknown>;
  systemPrompt?: string;
  promptTemplate?: string;
  version?: string;
}

interface PricePredictionInput {
  productId: string;
  marketplace: Marketplace;
  modelId?: string;
}

interface DemandForecastInput {
  targetType: DemandForecastTarget;
  targetId?: string;
  targetName?: string;
  marketplace?: Marketplace;
  forecastPeriod: ForecastPeriod;
  startDate: Date;
  endDate: Date;
  modelId?: string;
}

interface RecommendationInput {
  recommendationType: RecommendationType;
  userId?: string;
  sourceProductId?: string;
  category?: string;
  marketplace?: Marketplace;
  limit?: number;
  modelId?: string;
}

interface PriceOptimizationInput {
  targetType: PriceOptimizationTarget;
  targetId?: string;
  marketplace?: Marketplace;
  strategy: PriceOptimizationStrategy;
  minPrice?: number;
  maxPrice?: number;
  minMargin?: number;
  maxDiscount?: number;
  targetMetric?: PriceOptimizationMetric;
  targetValue?: number;
  rules?: Record<string, unknown>[];
  autoUpdate?: boolean;
  updateFrequency?: number;
  monitorCompetitors?: boolean;
  competitorThreshold?: number;
}

interface CompetitorPriceInput {
  productId?: string;
  competitorName: string;
  competitorUrl?: string;
  marketplace: string;
  matchedTitle?: string;
  matchConfidence?: number;
  price: number;
  currency?: string;
  shippingCost?: number;
  inStock?: boolean;
  stockQuantity?: number;
  sellerRating?: number;
  sellerReviews?: number;
  source: string;
}

interface OpenAiResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ========================================
// AI モデルサービス
// ========================================

export class AiModelService {
  /**
   * AIモデル作成
   */
  static async createModel(input: AiModelCreateInput): Promise<AiModel> {
    return prisma.aiModel.create({
      data: {
        ...input,
        config: (input.config ?? {}) as any,
        provider: input.provider ?? 'OPENAI',
        version: input.version ?? '1.0',
      },
    });
  }

  /**
   * AIモデル取得
   */
  static async getModel(id: string): Promise<AiModel | null> {
    return prisma.aiModel.findUnique({
      where: { id },
    });
  }

  /**
   * モデルタイプ別の最新モデル取得
   */
  static async getLatestModel(modelType: AiModelType): Promise<AiModel | null> {
    return prisma.aiModel.findFirst({
      where: {
        modelType,
        isActive: true,
        isLatest: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * AIモデル一覧
   */
  static async listModels(options: {
    modelType?: AiModelType;
    provider?: AiProvider;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ models: AiModel[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (options.modelType) where.modelType = options.modelType;
    if (options.provider) where.provider = options.provider;
    if (options.isActive !== undefined) where.isActive = options.isActive;

    const [models, total] = await Promise.all([
      prisma.aiModel.findMany({
        where,
        orderBy: [{ isLatest: 'desc' }, { createdAt: 'desc' }],
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
      }),
      prisma.aiModel.count({ where }),
    ]);

    return { models, total };
  }

  /**
   * AI API呼び出し
   */
  static async callAi(
    model: AiModel,
    prompt: string,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<{ content: string; inputTokens: number; outputTokens: number; cost: number }> {
    const startTime = Date.now();
    const config = model.config as Record<string, unknown>;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const systemPrompt = model.systemPrompt ?? 'You are a helpful assistant.';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: options.temperature ?? (config.temperature as number) ?? 0.7,
        max_tokens: options.maxTokens ?? (config.maxTokens as number) ?? 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = (await response.json()) as OpenAiResponse;
    const content = data.choices[0]?.message?.content ?? '';
    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;

    // コスト計算（GPT-4o: input $5/1M, output $15/1M）
    const cost = (inputTokens * 0.000005 + outputTokens * 0.000015);

    const latency = Date.now() - startTime;

    // モデル統計更新
    await prisma.aiModel.update({
      where: { id: model.id },
      data: {
        totalPredictions: { increment: 1 },
        totalInputTokens: { increment: inputTokens },
        totalOutputTokens: { increment: outputTokens },
        totalCost: { increment: cost },
        averageLatency: model.averageLatency
          ? (model.averageLatency * model.totalPredictions + latency) / (model.totalPredictions + 1)
          : latency,
      },
    });

    return { content, inputTokens, outputTokens, cost };
  }
}

// ========================================
// 価格予測サービス
// ========================================

export class PricePredictionService {
  /**
   * 価格予測実行
   */
  static async predictPrice(input: PricePredictionInput): Promise<PricePrediction> {
    // 商品情報取得
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      include: {
        listings: {
          where: { marketplace: input.marketplace },
        },
        competitorPrices: {
          where: { marketplace: input.marketplace },
          orderBy: { collectedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new Error(`Product not found: ${input.productId}`);
    }

    // AIモデル取得
    const model = input.modelId
      ? await prisma.aiModel.findUnique({ where: { id: input.modelId } })
      : await AiModelService.getLatestModel('PRICE_PREDICTION');

    if (!model) {
      throw new Error('No price prediction model available');
    }

    // 現在価格
    const listing = product.listings[0];
    const currentPrice = listing?.listingPrice ?? this.calculateInitialPrice(product.price);

    // 競合分析
    const competitors = product.competitorPrices;
    const competitorCount = competitors.length;
    const competitorPrices = competitors.map((c) => c.totalPrice ?? c.price);
    const averageCompetitorPrice = competitorCount > 0
      ? competitorPrices.reduce((a, b) => a + b, 0) / competitorCount
      : null;
    const lowestCompetitorPrice = competitorCount > 0
      ? Math.min(...competitorPrices)
      : null;

    // プロンプト生成
    const prompt = this.buildPricePredictionPrompt(product, {
      currentPrice,
      competitors,
      marketplace: input.marketplace,
    });

    // AI予測実行
    const startTime = Date.now();
    let predictedPrice: number;
    let confidence: number;
    let factors: Array<{ name: string; weight: number; impact: string }>;
    let reasoning: string;
    let recommendedAction: PriceRecommendedAction;
    let recommendedPrice: number | undefined;

    try {
      const aiResult = await AiModelService.callAi(model, prompt);

      // レスポンスパース
      const parsed = this.parsePricePredictionResponse(aiResult.content);
      predictedPrice = parsed.predictedPrice;
      confidence = parsed.confidence;
      factors = parsed.factors;
      reasoning = parsed.reasoning;
      recommendedAction = parsed.recommendedAction;
      recommendedPrice = parsed.recommendedPrice;

      // 予測ログ記録
      await this.logPrediction(model.id, input, aiResult, 'SUCCESS', Date.now() - startTime);
    } catch (error) {
      // フォールバック: ルールベース価格計算
      const fallback = this.calculateFallbackPrice(currentPrice, averageCompetitorPrice, lowestCompetitorPrice);
      predictedPrice = fallback.predictedPrice;
      confidence = fallback.confidence;
      factors = fallback.factors;
      reasoning = fallback.reasoning;
      recommendedAction = fallback.recommendedAction;
      recommendedPrice = fallback.recommendedPrice;

      await this.logPrediction(model.id, input, null, 'FAILED', Date.now() - startTime, error);
    }

    // 有効期限（24時間後）
    const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 予測結果保存
    return prisma.pricePrediction.create({
      data: {
        modelId: model.id,
        productId: input.productId,
        marketplace: input.marketplace,
        currentPrice,
        predictedPrice,
        confidence,
        priceRange: {
          min: predictedPrice * 0.9,
          max: predictedPrice * 1.1,
        },
        factors: factors as any,
        reasoning,
        recommendedAction,
        recommendedPrice,
        competitorCount,
        averageCompetitorPrice,
        lowestCompetitorPrice,
        validUntil,
      },
    });
  }

  /**
   * 価格予測プロンプト生成
   */
  private static buildPricePredictionPrompt(
    product: { title: string; titleEn: string | null; category: string | null; brand: string | null; price: number },
    context: {
      currentPrice: number;
      competitors: Array<{ competitorName: string; price: number; totalPrice: number | null }>;
      marketplace: Marketplace;
    }
  ): string {
    const competitorInfo = context.competitors.length > 0
      ? context.competitors.map((c) => `- ${c.competitorName}: $${c.totalPrice ?? c.price}`).join('\n')
      : 'No competitor data available';

    return `Analyze the following product and predict the optimal selling price.

Product Information:
- Title: ${product.titleEn ?? product.title}
- Category: ${product.category ?? 'Unknown'}
- Brand: ${product.brand ?? 'Unknown'}
- Cost Price: ¥${product.price} (approximately $${(product.price / 150).toFixed(2)})
- Current Listing Price: $${context.currentPrice}
- Marketplace: ${context.marketplace}

Competitor Prices:
${competitorInfo}

Please provide a JSON response with the following structure:
{
  "predictedPrice": <optimal price in USD>,
  "confidence": <confidence level 0-1>,
  "factors": [
    {"name": "<factor name>", "weight": <importance 0-1>, "impact": "<positive/negative/neutral>"}
  ],
  "reasoning": "<explanation of the prediction>",
  "recommendedAction": "<INCREASE/DECREASE/MAINTAIN/REVIEW>",
  "recommendedPrice": <recommended price if action is INCREASE or DECREASE>
}`;
  }

  /**
   * AI応答パース
   */
  private static parsePricePredictionResponse(content: string): {
    predictedPrice: number;
    confidence: number;
    factors: Array<{ name: string; weight: number; impact: string }>;
    reasoning: string;
    recommendedAction: PriceRecommendedAction;
    recommendedPrice?: number;
  } {
    try {
      // JSONブロックを抽出
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        predictedPrice: parsed.predictedPrice ?? 0,
        confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
        factors: parsed.factors ?? [],
        reasoning: parsed.reasoning ?? '',
        recommendedAction: this.mapRecommendedAction(parsed.recommendedAction),
        recommendedPrice: parsed.recommendedPrice,
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  private static mapRecommendedAction(action: string): PriceRecommendedAction {
    const actionMap: Record<string, PriceRecommendedAction> = {
      INCREASE: 'INCREASE',
      DECREASE: 'DECREASE',
      MAINTAIN: 'MAINTAIN',
      REVIEW: 'REVIEW',
    };
    return actionMap[action?.toUpperCase()] ?? 'REVIEW';
  }

  /**
   * フォールバック価格計算
   */
  private static calculateFallbackPrice(
    currentPrice: number,
    avgCompetitorPrice: number | null,
    lowestCompetitorPrice: number | null
  ): {
    predictedPrice: number;
    confidence: number;
    factors: Array<{ name: string; weight: number; impact: string }>;
    reasoning: string;
    recommendedAction: PriceRecommendedAction;
    recommendedPrice?: number;
  } {
    let predictedPrice = currentPrice;
    let recommendedAction: PriceRecommendedAction = 'MAINTAIN';
    let recommendedPrice: number | undefined;

    if (avgCompetitorPrice && lowestCompetitorPrice) {
      // 競合価格の中央値を基準に調整
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

    return {
      predictedPrice,
      confidence: 0.5,
      factors: [
        { name: 'Rule-based calculation', weight: 1, impact: 'neutral' },
      ],
      reasoning: 'Fallback calculation based on competitor prices',
      recommendedAction,
      recommendedPrice,
    };
  }

  /**
   * 初期価格計算
   */
  private static calculateInitialPrice(costJpy: number): number {
    const exchangeRate = 150;
    const costUsd = costJpy / exchangeRate;
    const margin = 1.3; // 30%マージン
    return Math.round(costUsd * margin * 100) / 100;
  }

  /**
   * 予測ログ記録
   */
  private static async logPrediction(
    modelId: string,
    input: PricePredictionInput,
    aiResult: { content: string; inputTokens: number; outputTokens: number; cost: number } | null,
    status: AiPredictionStatus,
    latency: number,
    error?: unknown
  ): Promise<void> {
    await prisma.aiPredictionLog.create({
      data: {
        modelId,
        predictionType: 'PRICE',
        input: input as any,
        output: aiResult ? { content: aiResult.content } : undefined,
        confidence: null,
        latency,
        inputTokens: aiResult?.inputTokens ?? 0,
        outputTokens: aiResult?.outputTokens ?? 0,
        cost: aiResult?.cost ?? 0,
        status,
        errorMessage: error instanceof Error ? error.message : undefined,
        completedAt: new Date(),
      },
    });
  }

  /**
   * 商品の価格予測一覧取得
   */
  static async getPredictionsForProduct(
    productId: string,
    marketplace?: Marketplace
  ): Promise<PricePrediction[]> {
    const where: Record<string, unknown> = { productId };
    if (marketplace) where.marketplace = marketplace;

    return prisma.pricePrediction.findMany({
      where,
      orderBy: { predictedAt: 'desc' },
      take: 10,
    });
  }

  /**
   * 予測精度検証
   */
  static async validatePredictions(): Promise<{ validated: number; accurate: number }> {
    const predictions = await prisma.pricePrediction.findMany({
      where: {
        wasAccurate: null,
        validUntil: { lt: new Date() },
      },
      include: {
        product: {
          include: {
            listings: true,
          },
        },
      },
    });

    let validated = 0;
    let accurate = 0;

    for (const prediction of predictions) {
      const listing = prediction.product.listings.find(
        (l) => l.marketplace === prediction.marketplace
      );

      if (listing) {
        const actualPrice = listing.listingPrice;
        const priceDiff = Math.abs(actualPrice - prediction.predictedPrice);
        const accuracy = 1 - priceDiff / prediction.predictedPrice;
        const isAccurate = accuracy >= 0.9; // 10%以内なら正確

        await prisma.pricePrediction.update({
          where: { id: prediction.id },
          data: {
            actualPrice,
            wasAccurate: isAccurate,
            accuracy,
          },
        });

        validated++;
        if (isAccurate) accurate++;
      }
    }

    return { validated, accurate };
  }
}

// ========================================
// 需要予測サービス
// ========================================

export class DemandForecastService {
  /**
   * 需要予測実行
   */
  static async forecast(input: DemandForecastInput): Promise<DemandForecast> {
    // AIモデル取得
    const model = input.modelId
      ? await prisma.aiModel.findUnique({ where: { id: input.modelId } })
      : await AiModelService.getLatestModel('DEMAND_FORECAST');

    if (!model) {
      throw new Error('No demand forecast model available');
    }

    // 過去の販売データ取得
    const historicalData = await this.getHistoricalSales(input);

    // プロンプト生成
    const prompt = this.buildDemandForecastPrompt(input, historicalData);

    let predictedDemand: number;
    let confidence: number;
    let trend: DemandTrend;
    let trendStrength: number;
    let growthRate: number;
    let seasonalIndex: number;
    let factors: Array<{ name: string; impact: string }>;
    let recommendedStock: number;
    let reorderPoint: number;

    try {
      const aiResult = await AiModelService.callAi(model, prompt);
      const parsed = this.parseDemandForecastResponse(aiResult.content);

      predictedDemand = parsed.predictedDemand;
      confidence = parsed.confidence;
      trend = parsed.trend;
      trendStrength = parsed.trendStrength;
      growthRate = parsed.growthRate;
      seasonalIndex = parsed.seasonalIndex;
      factors = parsed.factors;
      recommendedStock = parsed.recommendedStock;
      reorderPoint = parsed.reorderPoint;
    } catch (error) {
      // フォールバック
      const fallback = this.calculateFallbackForecast(historicalData);
      predictedDemand = fallback.predictedDemand;
      confidence = fallback.confidence;
      trend = fallback.trend;
      trendStrength = 0.5;
      growthRate = 0;
      seasonalIndex = 1;
      factors = [];
      recommendedStock = Math.ceil(predictedDemand * 1.2);
      reorderPoint = Math.ceil(predictedDemand * 0.3);
    }

    return prisma.demandForecast.create({
      data: {
        modelId: model.id,
        targetType: input.targetType,
        targetId: input.targetId,
        targetName: input.targetName,
        marketplace: input.marketplace,
        forecastPeriod: input.forecastPeriod,
        startDate: input.startDate,
        endDate: input.endDate,
        predictedDemand,
        confidence,
        demandRange: {
          min: Math.floor(predictedDemand * 0.8),
          max: Math.ceil(predictedDemand * 1.2),
        },
        trend,
        trendStrength,
        growthRate,
        seasonalIndex,
        isSeasonalPeak: seasonalIndex > 1.2,
        factors: factors as any,
        recommendedStock,
        reorderPoint,
      },
    });
  }

  /**
   * 過去の販売データ取得
   */
  private static async getHistoricalSales(input: DemandForecastInput): Promise<{
    totalSales: number;
    salesByPeriod: Array<{ period: string; count: number }>;
  }> {
    // 過去90日間のデータを取得
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      soldAt: { gte: startDate },
    };

    if (input.marketplace) {
      where.marketplace = input.marketplace;
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        listing: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // ターゲットタイプでフィルタリング
    const filteredSales = sales.filter((sale) => {
      const listing = sale.listing;
      if (!listing) return true;
      const product = listing.product;
      switch (input.targetType) {
        case 'PRODUCT':
          return product.id === input.targetId;
        case 'CATEGORY':
          return product.category === input.targetId || product.category === input.targetName;
        case 'BRAND':
          return product.brand === input.targetId || product.brand === input.targetName;
        default:
          return true;
      }
    });

    // 期間別集計
    const salesByPeriod: Record<string, number> = {};
    for (const sale of filteredSales) {
      const period = this.getPeriodKey(sale.createdAt, input.forecastPeriod);
      salesByPeriod[period] = (salesByPeriod[period] ?? 0) + 1;
    }

    return {
      totalSales: filteredSales.length,
      salesByPeriod: Object.entries(salesByPeriod).map(([period, count]) => ({ period, count })),
    };
  }

  private static getPeriodKey(date: Date, period: ForecastPeriod): string {
    const d = new Date(date);
    switch (period) {
      case 'DAILY':
        return d.toISOString().split('T')[0];
      case 'WEEKLY':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'MONTHLY':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      case 'QUARTERLY':
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        return `${d.getFullYear()}-Q${quarter}`;
      default:
        return d.toISOString().split('T')[0];
    }
  }

  /**
   * 需要予測プロンプト生成
   */
  private static buildDemandForecastPrompt(
    input: DemandForecastInput,
    historicalData: { totalSales: number; salesByPeriod: Array<{ period: string; count: number }> }
  ): string {
    const salesHistory = historicalData.salesByPeriod
      .map((s) => `${s.period}: ${s.count} sales`)
      .join('\n');

    return `Forecast demand for the following target:

Target Information:
- Type: ${input.targetType}
- Name/ID: ${input.targetName ?? input.targetId ?? 'All'}
- Marketplace: ${input.marketplace ?? 'All'}
- Forecast Period: ${input.forecastPeriod}
- Start Date: ${input.startDate.toISOString().split('T')[0]}
- End Date: ${input.endDate.toISOString().split('T')[0]}

Historical Sales (last 90 days):
Total: ${historicalData.totalSales} sales
${salesHistory || 'No historical data available'}

Please provide a JSON response with the following structure:
{
  "predictedDemand": <predicted number of sales>,
  "confidence": <confidence level 0-1>,
  "trend": "<INCREASING/DECREASING/STABLE/VOLATILE>",
  "trendStrength": <strength 0-1>,
  "growthRate": <growth rate in percentage>,
  "seasonalIndex": <seasonality factor, 1 = neutral>,
  "factors": [
    {"name": "<factor>", "impact": "<description>"}
  ],
  "recommendedStock": <recommended inventory level>,
  "reorderPoint": <inventory level to trigger reorder>
}`;
  }

  /**
   * 需要予測応答パース
   */
  private static parseDemandForecastResponse(content: string): {
    predictedDemand: number;
    confidence: number;
    trend: DemandTrend;
    trendStrength: number;
    growthRate: number;
    seasonalIndex: number;
    factors: Array<{ name: string; impact: string }>;
    recommendedStock: number;
    reorderPoint: number;
  } {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const trendMap: Record<string, DemandTrend> = {
      INCREASING: 'INCREASING',
      DECREASING: 'DECREASING',
      STABLE: 'STABLE',
      VOLATILE: 'VOLATILE',
    };

    return {
      predictedDemand: parsed.predictedDemand ?? 0,
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
      trend: trendMap[parsed.trend?.toUpperCase()] ?? 'STABLE',
      trendStrength: parsed.trendStrength ?? 0.5,
      growthRate: parsed.growthRate ?? 0,
      seasonalIndex: parsed.seasonalIndex ?? 1,
      factors: parsed.factors ?? [],
      recommendedStock: parsed.recommendedStock ?? 0,
      reorderPoint: parsed.reorderPoint ?? 0,
    };
  }

  /**
   * フォールバック予測計算
   */
  private static calculateFallbackForecast(historicalData: {
    totalSales: number;
    salesByPeriod: Array<{ period: string; count: number }>;
  }): {
    predictedDemand: number;
    confidence: number;
    trend: DemandTrend;
  } {
    const periods = historicalData.salesByPeriod;
    if (periods.length === 0) {
      return { predictedDemand: 0, confidence: 0.3, trend: 'STABLE' };
    }

    const avgSales = historicalData.totalSales / periods.length;
    const recentSales = periods.slice(-3).reduce((sum, p) => sum + p.count, 0) / Math.min(3, periods.length);

    let trend: DemandTrend = 'STABLE';
    if (recentSales > avgSales * 1.2) {
      trend = 'INCREASING';
    } else if (recentSales < avgSales * 0.8) {
      trend = 'DECREASING';
    }

    return {
      predictedDemand: Math.round(recentSales),
      confidence: 0.5,
      trend,
    };
  }
}

// ========================================
// 商品推薦サービス
// ========================================

export class RecommendationService {
  /**
   * 推薦生成
   */
  static async generateRecommendations(input: RecommendationInput): Promise<ProductRecommendation> {
    const model = input.modelId
      ? await prisma.aiModel.findUnique({ where: { id: input.modelId } })
      : await AiModelService.getLatestModel('PRODUCT_RECOMMENDATION');

    const limit = input.limit ?? 10;

    // 候補商品取得
    const candidates = await this.getCandidateProducts(input);

    if (candidates.length === 0) {
      return prisma.productRecommendation.create({
        data: {
          modelId: model?.id,
          recommendationType: input.recommendationType,
          inputData: input as any,
          recommendations: [],
          totalCandidates: 0,
          userId: input.userId,
          sourceProductId: input.sourceProductId,
          category: input.category,
          marketplace: input.marketplace,
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }

    // スコアリング
    let recommendations: Array<{ productId: string; score: number; reason: string }>;

    if (model) {
      recommendations = await this.scoreWithAi(model, candidates, input);
    } else {
      recommendations = this.scoreWithRules(candidates, input);
    }

    // 上位N件を取得
    const topRecommendations = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return prisma.productRecommendation.create({
      data: {
        modelId: model?.id,
        recommendationType: input.recommendationType,
        inputData: input as any,
        recommendations: topRecommendations as any,
        totalCandidates: candidates.length,
        topScore: topRecommendations[0]?.score,
        userId: input.userId,
        sourceProductId: input.sourceProductId,
        category: input.category,
        marketplace: input.marketplace,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  /**
   * 候補商品取得
   */
  private static async getCandidateProducts(input: RecommendationInput): Promise<Array<{
    id: string;
    title: string;
    titleEn: string | null;
    category: string | null;
    brand: string | null;
    price: number;
    status: string;
  }>> {
    const where: Record<string, unknown> = {
      status: { in: ['ACTIVE', 'APPROVED', 'READY_TO_REVIEW'] },
    };

    if (input.category) {
      where.category = input.category;
    }

    if (input.sourceProductId) {
      // 類似商品の場合、同じ商品を除外
      where.id = { not: input.sourceProductId };
    }

    return prisma.product.findMany({
      where,
      select: {
        id: true,
        title: true,
        titleEn: true,
        category: true,
        brand: true,
        price: true,
        status: true,
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * AIスコアリング
   */
  private static async scoreWithAi(
    model: AiModel,
    candidates: Array<{
      id: string;
      title: string;
      titleEn: string | null;
      category: string | null;
      brand: string | null;
    }>,
    input: RecommendationInput
  ): Promise<Array<{ productId: string; score: number; reason: string }>> {
    const productList = candidates
      .slice(0, 20) // APIコスト削減のため上位20件
      .map((p, i) => `${i + 1}. ${p.titleEn ?? p.title} (Category: ${p.category ?? 'N/A'}, Brand: ${p.brand ?? 'N/A'})`)
      .join('\n');

    const prompt = `Score the following products for recommendation type: ${input.recommendationType}

${input.userId ? `User preferences: Personalized for user ${input.userId}` : ''}
${input.sourceProductId ? `Source product ID: ${input.sourceProductId}` : ''}
${input.category ? `Target category: ${input.category}` : ''}

Products:
${productList}

Please provide a JSON response with scores and reasons:
{
  "scores": [
    {"index": 1, "score": 0.95, "reason": "High relevance because..."},
    ...
  ]
}`;

    try {
      const aiResult = await AiModelService.callAi(model, prompt);
      const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.scores.map((s: { index: number; score: number; reason: string }) => ({
          productId: candidates[s.index - 1]?.id,
          score: s.score,
          reason: s.reason,
        })).filter((r: { productId: string }) => r.productId);
      }
    } catch (error) {
      console.error('AI scoring failed:', error);
    }

    // フォールバック
    return this.scoreWithRules(candidates, input);
  }

  /**
   * ルールベーススコアリング
   */
  private static scoreWithRules(
    candidates: Array<{
      id: string;
      title: string;
      category: string | null;
      brand: string | null;
      price?: number;
    }>,
    input: RecommendationInput
  ): Array<{ productId: string; score: number; reason: string }> {
    return candidates.map((product) => {
      let score = 0.5;
      let reason = 'Default score';

      // カテゴリマッチ
      if (input.category && product.category === input.category) {
        score += 0.2;
        reason = 'Category match';
      }

      // 価格帯による調整
      if (product.price && product.price > 5000) {
        score += 0.1;
        reason += ', premium product';
      }

      // ブランド有無
      if (product.brand) {
        score += 0.1;
        reason += ', branded';
      }

      return {
        productId: product.id,
        score: Math.min(1, score),
        reason,
      };
    });
  }
}

// ========================================
// 競合価格サービス
// ========================================

export class CompetitorPriceService {
  /**
   * 競合価格記録
   */
  static async recordCompetitorPrice(input: CompetitorPriceInput): Promise<CompetitorPrice> {
    const totalPrice = input.shippingCost
      ? input.price + input.shippingCost
      : input.price;

    return prisma.competitorPrice.create({
      data: {
        ...input,
        currency: input.currency ?? 'USD',
        totalPrice,
        inStock: input.inStock ?? true,
      },
    });
  }

  /**
   * 商品の競合価格一覧
   */
  static async getCompetitorPrices(productId: string): Promise<CompetitorPrice[]> {
    return prisma.competitorPrice.findMany({
      where: { productId },
      orderBy: { collectedAt: 'desc' },
      take: 50,
    });
  }

  /**
   * 競合価格統計
   */
  static async getCompetitorStats(productId: string): Promise<{
    competitorCount: number;
    averagePrice: number;
    lowestPrice: number;
    highestPrice: number;
    priceRange: number;
  } | null> {
    const prices = await prisma.competitorPrice.findMany({
      where: {
        productId,
        collectedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 過去7日間
        },
        inStock: true,
      },
      select: {
        totalPrice: true,
        price: true,
      },
    });

    if (prices.length === 0) {
      return null;
    }

    const priceValues = prices.map((p) => p.totalPrice ?? p.price);
    const sum = priceValues.reduce((a, b) => a + b, 0);
    const min = Math.min(...priceValues);
    const max = Math.max(...priceValues);

    return {
      competitorCount: prices.length,
      averagePrice: sum / prices.length,
      lowestPrice: min,
      highestPrice: max,
      priceRange: max - min,
    };
  }
}

// ========================================
// 価格最適化サービス
// ========================================

export class PriceOptimizationService {
  /**
   * 価格最適化設定作成
   */
  static async createOptimization(input: PriceOptimizationInput): Promise<PriceOptimization> {
    return prisma.priceOptimization.create({
      data: {
        ...input,
        rules: (input.rules ?? []) as any,
        targetMetric: input.targetMetric ?? 'PROFIT',
        autoUpdate: input.autoUpdate ?? false,
        monitorCompetitors: input.monitorCompetitors ?? true,
        isActive: true,
      },
    });
  }

  /**
   * 価格最適化実行
   */
  static async optimizePrices(optimizationId: string): Promise<{
    optimized: number;
    priceChanges: Array<{ productId: string; oldPrice: number; newPrice: number }>;
  }> {
    const optimization = await prisma.priceOptimization.findUnique({
      where: { id: optimizationId },
    });

    if (!optimization || !optimization.isActive) {
      throw new Error('Price optimization not found or inactive');
    }

    // 対象商品取得
    const products = await this.getTargetProducts(optimization);
    const priceChanges: Array<{ productId: string; oldPrice: number; newPrice: number }> = [];

    for (const product of products) {
      // 現在のリスティング取得
      const listing = await prisma.listing.findFirst({
        where: {
          productId: product.id,
          marketplace: optimization.marketplace ?? undefined,
          status: 'ACTIVE',
        },
      });

      if (!listing) continue;

      // 競合価格取得
      const competitorStats = await CompetitorPriceService.getCompetitorStats(product.id);

      // 最適価格計算
      const newPrice = this.calculateOptimalPrice(
        listing.listingPrice,
        product.price,
        competitorStats,
        optimization
      );

      if (Math.abs(newPrice - listing.listingPrice) > 0.01) {
        // 自動更新が有効な場合は価格を更新
        if (optimization.autoUpdate) {
          await prisma.listing.update({
            where: { id: listing.id },
            data: { listingPrice: newPrice },
          });
        }

        priceChanges.push({
          productId: product.id,
          oldPrice: listing.listingPrice,
          newPrice,
        });
      }
    }

    // 統計更新
    await prisma.priceOptimization.update({
      where: { id: optimizationId },
      data: {
        totalOptimizations: { increment: 1 },
        lastUpdatedAt: new Date(),
        averagePriceChange: priceChanges.length > 0
          ? priceChanges.reduce((sum, c) => sum + Math.abs(c.newPrice - c.oldPrice), 0) / priceChanges.length
          : 0,
      },
    });

    return { optimized: priceChanges.length, priceChanges };
  }

  /**
   * 対象商品取得
   */
  private static async getTargetProducts(optimization: PriceOptimization): Promise<Array<{
    id: string;
    price: number;
    category: string | null;
    brand: string | null;
  }>> {
    const where: Record<string, unknown> = {
      status: { in: ['ACTIVE', 'APPROVED'] },
    };

    switch (optimization.targetType) {
      case 'PRODUCT':
        if (optimization.targetId) {
          where.id = optimization.targetId;
        }
        break;
      case 'CATEGORY':
        if (optimization.targetId) {
          where.category = optimization.targetId;
        }
        break;
      case 'BRAND':
        if (optimization.targetId) {
          where.brand = optimization.targetId;
        }
        break;
    }

    return prisma.product.findMany({
      where,
      select: {
        id: true,
        price: true,
        category: true,
        brand: true,
      },
      take: 100,
    });
  }

  /**
   * 最適価格計算
   */
  private static calculateOptimalPrice(
    currentPrice: number,
    costJpy: number,
    competitorStats: {
      averagePrice: number;
      lowestPrice: number;
      highestPrice: number;
    } | null,
    optimization: PriceOptimization
  ): number {
    const exchangeRate = 150;
    const costUsd = costJpy / exchangeRate;
    const minMargin = optimization.minMargin ?? 20;
    const minPrice = optimization.minPrice ?? costUsd * (1 + minMargin / 100);
    const maxPrice = optimization.maxPrice ?? costUsd * 3;

    let optimalPrice = currentPrice;

    switch (optimization.strategy) {
      case 'COMPETITIVE':
        if (competitorStats) {
          // 競合の最低価格よりやや下
          optimalPrice = competitorStats.lowestPrice * 0.98;
        }
        break;

      case 'PROFIT_MAXIMIZATION':
        if (competitorStats) {
          // 競合の平均価格よりやや上
          optimalPrice = competitorStats.averagePrice * 1.05;
        } else {
          // マージン30%
          optimalPrice = costUsd * 1.3;
        }
        break;

      case 'MARKET_PENETRATION':
        if (competitorStats) {
          // 競合の最低価格
          optimalPrice = competitorStats.lowestPrice;
        } else {
          // マージン10%
          optimalPrice = costUsd * 1.1;
        }
        break;

      case 'DYNAMIC':
        if (competitorStats) {
          // 需要に応じて動的調整（簡易版）
          const priceRange = competitorStats.highestPrice - competitorStats.lowestPrice;
          optimalPrice = competitorStats.lowestPrice + priceRange * 0.4;
        }
        break;

      default:
        // ルールベース
        if (competitorStats) {
          optimalPrice = competitorStats.averagePrice;
        }
    }

    // 制約適用
    optimalPrice = Math.max(minPrice, Math.min(maxPrice, optimalPrice));

    // 最大割引率チェック
    if (optimization.maxDiscount) {
      const maxDiscountPrice = currentPrice * (1 - optimization.maxDiscount / 100);
      optimalPrice = Math.max(optimalPrice, maxDiscountPrice);
    }

    return Math.round(optimalPrice * 100) / 100;
  }
}

// ========================================
// AI学習ジョブサービス
// ========================================

export class AiTrainingService {
  /**
   * 学習ジョブ作成
   */
  static async createTrainingJob(input: {
    modelId: string;
    jobType: AiTrainingJobType;
    name: string;
    description?: string;
    datasetConfig: Record<string, unknown>;
    hyperparameters?: Record<string, unknown>;
  }): Promise<AiTrainingJob> {
    return prisma.aiTrainingJob.create({
      data: {
        ...input,
        datasetConfig: input.datasetConfig as any,
        hyperparameters: (input.hyperparameters ?? {}) as any,
        status: 'PENDING',
      },
    });
  }

  /**
   * 学習ジョブ一覧
   */
  static async listTrainingJobs(modelId?: string): Promise<AiTrainingJob[]> {
    return prisma.aiTrainingJob.findMany({
      where: modelId ? { modelId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * 学習ジョブ開始
   */
  static async startTrainingJob(jobId: string): Promise<AiTrainingJob> {
    return prisma.aiTrainingJob.update({
      where: { id: jobId },
      data: {
        status: 'PREPARING',
        startedAt: new Date(),
      },
    });
  }

  /**
   * 学習ジョブ完了
   */
  static async completeTrainingJob(
    jobId: string,
    metrics: Record<string, unknown>,
    outputModelId?: string,
    artifactUrl?: string
  ): Promise<AiTrainingJob> {
    const job = await prisma.aiTrainingJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Training job not found: ${jobId}`);
    }

    const completedAt = new Date();
    const duration = job.startedAt
      ? completedAt.getTime() - job.startedAt.getTime()
      : null;

    return prisma.aiTrainingJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt,
        duration,
        metrics: metrics as any,
        outputModelId,
        artifactUrl,
      },
    });
  }
}

export default {
  AiModelService,
  PricePredictionService,
  DemandForecastService,
  RecommendationService,
  CompetitorPriceService,
  PriceOptimizationService,
  AiTrainingService,
};

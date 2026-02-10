/**
 * Phase 39: エンリッチメントエンジン
 * 翻訳・属性抽出・コンテンツ検証を統合管理
 */
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import OpenAI from 'openai';

const log = logger.child({ module: 'enrichment-service' });

// OpenAI クライアント
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ========================================
// 型定義
// ========================================

export interface TranslationResult {
  en: { title: string; description: string };
  ru?: { title: string; description: string };
}

export interface AttributeResult {
  brand?: string;
  color?: string;
  size?: string;
  material?: string;
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  category?: string;
  itemSpecifics: Record<string, string>;
  confidence: number;
}

export interface ValidationResult {
  passed: boolean;
  flags: string[];
  reviewNotes?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface EnrichmentResult {
  translations: TranslationResult;
  attributes: AttributeResult;
  validation: ValidationResult;
}

export interface PricingResult {
  costJpy: number;
  costUsd: number;
  exchangeRate: number;
  profitRate: number;
  platformFee: number;
  paymentFee: number;
  shippingCost: number;
  finalPriceUsd: number;
}

// ========================================
// 翻訳・属性抽出サービス
// ========================================

const ENRICHMENT_PROMPT = `あなたは越境EC商品データの専門家です。
以下の日本語商品情報を分析し、JSON形式で出力してください。

【入力】
タイトル: {title}
説明文: {description}
カテゴリ: {category}
ブランド: {brand}

【出力形式】
{
  "translations": {
    "en": { "title": "英語タイトル", "description": "英語説明文" },
    "ru": { "title": "ロシア語タイトル", "description": "ロシア語説明文" }
  },
  "attributes": {
    "brand": "ブランド名（英語）",
    "color": "色（英語）",
    "size": "サイズ",
    "material": "素材（英語）",
    "condition": "new|like_new|good|fair|poor",
    "category": "カテゴリ（英語）",
    "itemSpecifics": { "キー": "値" },
    "confidence": 0.0-1.0
  },
  "validation": {
    "passed": true/false,
    "flags": ["prohibited_item", "trademark", "battery", "hazardous", "cites", "adult", "pharmaceutical", "weapon"],
    "reviewNotes": "問題がある場合のみ記載",
    "severity": "low|medium|high|critical"
  }
}

【翻訳のルール】
- 商品説明として自然で魅力的な表現にする
- 専門用語は正確に翻訳する
- ブランド名は翻訳しない

【属性抽出のルール】
- 元データから確実に推測できるもののみ抽出
- 不明な場合はnullにする
- confidenceは抽出の確信度（0.0-1.0）

【検証のルール】
以下をチェックし、該当する場合はflagsに追加:
- battery: リチウムイオン電池、ボタン電池
- hazardous: 可燃物、スプレー缶、化学物質
- cites: ワシントン条約対象（象牙、べっ甲、毛皮）
- trademark: 偽ブランド品の疑い（価格が異常に安い等）
- adult: 成人向けコンテンツ
- pharmaceutical: 医薬品、サプリメント
- weapon: ナイフ、銃器類

severityの基準:
- critical: 明確な禁制品（自動却下）
- high: 禁制品の可能性高（却下推奨）
- medium: 要確認（人間レビュー推奨）
- low: 軽微な問題（警告のみ）`;

export class TranslatorService {
  /**
   * 翻訳・属性抽出・検証を一括実行
   */
  async enrichProduct(
    productId: string
  ): Promise<EnrichmentResult> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    log.info({
      type: 'enrich_start',
      productId,
      title: product.title,
    });

    const prompt = ENRICHMENT_PROMPT
      .replace('{title}', product.title)
      .replace('{description}', product.description || '')
      .replace('{category}', product.category || '不明')
      .replace('{brand}', product.brand || '不明');

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a cross-border e-commerce product data specialist. Always respond in valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const result = JSON.parse(content) as EnrichmentResult;

      log.info({
        type: 'enrich_success',
        productId,
        confidence: result.attributes.confidence,
        validationPassed: result.validation.passed,
        flags: result.validation.flags,
      });

      return result;
    } catch (error: any) {
      log.error({
        type: 'enrich_error',
        productId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 翻訳のみ実行
   */
  async translateOnly(
    title: string,
    description: string,
    targetLanguages: string[] = ['en', 'ru']
  ): Promise<TranslationResult> {
    const prompt = `Translate the following Japanese product information to ${targetLanguages.join(' and ')}.
Return JSON format:
{
  "en": { "title": "...", "description": "..." },
  "ru": { "title": "...", "description": "..." }
}

Japanese title: ${title}
Japanese description: ${description}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return JSON.parse(content) as TranslationResult;
  }
}

// ========================================
// 属性抽出サービス
// ========================================

export class AttributeExtractorService {
  /**
   * 商品から属性を抽出
   */
  async extractAttributes(
    title: string,
    description: string,
    category?: string
  ): Promise<AttributeResult> {
    const prompt = `Extract product attributes from the following Japanese product information.
Return JSON format with these fields (null if unknown):
{
  "brand": "brand name",
  "color": "color",
  "size": "size",
  "material": "material",
  "condition": "new|like_new|good|fair|poor",
  "category": "category",
  "itemSpecifics": { "key": "value" },
  "confidence": 0.0-1.0
}

Title: ${title}
Description: ${description}
Category hint: ${category || 'unknown'}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return JSON.parse(content) as AttributeResult;
  }
}

// ========================================
// コンテンツ検証サービス
// ========================================

export class ContentValidatorService {
  private prohibitedKeywordsCache: Map<string, { keywords: string[]; severity: string }> = new Map();

  /**
   * 禁制品キーワードを読み込み
   */
  async loadProhibitedKeywords(): Promise<void> {
    const keywords = await prisma.prohibitedKeyword.findMany({
      where: { isActive: true },
    });

    this.prohibitedKeywordsCache.clear();
    for (const kw of keywords) {
      const existing = this.prohibitedKeywordsCache.get(kw.category);
      if (existing) {
        existing.keywords.push(kw.keyword);
      } else {
        this.prohibitedKeywordsCache.set(kw.category, {
          keywords: [kw.keyword],
          severity: kw.severity,
        });
      }
    }

    log.info({
      type: 'keywords_loaded',
      categories: this.prohibitedKeywordsCache.size,
    });
  }

  /**
   * キーワードベースの高速チェック
   */
  quickCheck(title: string, description: string): { flags: string[]; severity: string } {
    const text = `${title} ${description}`.toLowerCase();
    const flags: string[] = [];
    let maxSeverity = 'low';

    // ハードコードされた禁制品キーワード（キャッシュがない場合用）
    const hardcodedKeywords: Record<string, string[]> = {
      battery: ['リチウム', 'lithium', 'バッテリー', 'battery', '電池', 'li-ion', 'lipo'],
      hazardous: ['スプレー', 'spray', '可燃', 'flammable', '引火', 'アルコール', 'alcohol'],
      cites: ['象牙', 'ivory', 'べっ甲', 'tortoiseshell', '毛皮', 'fur', 'ワニ', 'crocodile'],
      weapon: ['ナイフ', 'knife', '刀', 'sword', '銃', 'gun', 'エアガン', 'airsoft'],
      adult: ['アダルト', 'adult', '18禁', 'r18', 'エロ'],
      pharmaceutical: ['医薬品', 'medicine', 'サプリ', 'supplement', '薬'],
    };

    for (const [category, keywords] of Object.entries(hardcodedKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          flags.push(category);
          if (category === 'weapon' || category === 'adult') {
            maxSeverity = 'critical';
          } else if (category === 'battery' || category === 'hazardous') {
            maxSeverity = maxSeverity === 'critical' ? 'critical' : 'high';
          } else {
            maxSeverity = maxSeverity === 'critical' || maxSeverity === 'high' ? maxSeverity : 'medium';
          }
          break; // 同一カテゴリは1回のみ
        }
      }
    }

    return { flags: [...new Set(flags)], severity: maxSeverity };
  }

  /**
   * AIベースの詳細検証
   */
  async validateWithAI(
    title: string,
    description: string,
    price: number
  ): Promise<ValidationResult> {
    // 1. まずキーワードチェック
    const quickResult = this.quickCheck(title, description);

    // 高リスクフラグがあれば即座にAI検証
    if (quickResult.flags.length > 0) {
      // AI検証で詳細確認
      const prompt = `Analyze if this Japanese product is safe to sell on international e-commerce platforms.

Product:
- Title: ${title}
- Description: ${description}
- Price: ¥${price}

Flags detected: ${quickResult.flags.join(', ')}

Check for:
1. Battery content (lithium, button cells) - HIGH risk
2. Hazardous materials (flammable, chemical) - HIGH risk
3. CITES (ivory, endangered species) - CRITICAL risk
4. Trademark infringement (suspiciously cheap branded items) - MEDIUM risk
5. Adult content - CRITICAL risk
6. Pharmaceutical/supplements - HIGH risk
7. Weapons (knives, guns, airsoft) - CRITICAL risk

Respond in JSON:
{
  "passed": true/false,
  "flags": ["category1", "category2"],
  "reviewNotes": "explanation if flagged",
  "severity": "low|medium|high|critical"
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          passed: false,
          flags: quickResult.flags,
          reviewNotes: 'AI validation failed',
          severity: quickResult.severity as ValidationResult['severity'],
        };
      }

      return JSON.parse(content) as ValidationResult;
    }

    // フラグなしの場合は通過
    return {
      passed: true,
      flags: [],
      severity: 'low',
    };
  }
}

// ========================================
// 価格計算サービス
// ========================================

export interface PricingConfig {
  baseProfitRate: number;      // デフォルト: 0.3 (30%)
  minProfitRate: number;       // 最低: 0.15 (15%)
  maxProfitRate: number;       // 最高: 0.5 (50%)
  shippingCostJpy: number;     // 固定送料（円）
  shippingCostUsd: number;     // 固定送料（USD）
  joomFeeRate: number;         // Joom手数料率: 0.15 (15%)
  paymentFeeRate: number;      // 決済手数料: 0.029 (2.9%)
}

const DEFAULT_PRICING_CONFIG: PricingConfig = {
  baseProfitRate: 0.3,
  minProfitRate: 0.15,
  maxProfitRate: 0.5,
  shippingCostJpy: 500,
  shippingCostUsd: 5.0,
  joomFeeRate: 0.15,
  paymentFeeRate: 0.029,
};

export class PriceCalculatorService {
  /**
   * 現在の為替レートを取得
   */
  async getExchangeRate(): Promise<number> {
    const rate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: 'JPY',
        toCurrency: 'USD',
      },
      orderBy: { fetchedAt: 'desc' },
    });

    return rate?.rate || 150; // デフォルト150円/USD
  }

  /**
   * 価格を計算
   */
  async calculatePrice(
    costJpy: number,
    config: Partial<PricingConfig> = {}
  ): Promise<PricingResult> {
    const cfg = { ...DEFAULT_PRICING_CONFIG, ...config };
    const exchangeRate = await this.getExchangeRate();

    const costUsd = costJpy / exchangeRate;
    const basePrice = costUsd * (1 + cfg.baseProfitRate);
    const withFees = basePrice / (1 - cfg.joomFeeRate - cfg.paymentFeeRate);
    const finalPrice = withFees + cfg.shippingCostUsd;

    return {
      costJpy,
      costUsd: Math.round(costUsd * 100) / 100,
      exchangeRate,
      profitRate: cfg.baseProfitRate,
      platformFee: Math.round(finalPrice * cfg.joomFeeRate * 100) / 100,
      paymentFee: Math.round(finalPrice * cfg.paymentFeeRate * 100) / 100,
      shippingCost: cfg.shippingCostUsd,
      finalPriceUsd: Math.ceil(finalPrice * 100) / 100, // 切り上げ
    };
  }
}

// ========================================
// エンリッチメントタスクマネージャー
// ========================================

export class EnrichmentTaskManager {
  private translator = new TranslatorService();
  private validator = new ContentValidatorService();
  private priceCalculator = new PriceCalculatorService();

  /**
   * エンリッチメントタスクを作成
   */
  async createTask(productId: string, priority: number = 0): Promise<string> {
    const task = await prisma.enrichmentTask.upsert({
      where: { productId },
      create: {
        productId,
        priority,
        status: 'PENDING',
      },
      update: {
        priority,
        status: 'PENDING',
        errorCount: 0,
        lastError: null,
      },
    });

    log.info({
      type: 'task_created',
      taskId: task.id,
      productId,
    });

    return task.id;
  }

  /**
   * タスクを実行
   */
  async executeTask(taskId: string): Promise<void> {
    const task = await prisma.enrichmentTask.findUnique({
      where: { id: taskId },
      include: { product: true },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const startTime = Date.now();

    try {
      // ステータスを処理中に更新
      await prisma.enrichmentTask.update({
        where: { id: taskId },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
        },
      });

      // 1. 翻訳・属性抽出・検証
      await this.recordStep(taskId, 'TRANSLATION', 1, async () => {
        const result = await this.translator.enrichProduct(task.productId);

        await prisma.enrichmentTask.update({
          where: { id: taskId },
          data: {
            translations: result.translations as any,
            attributes: result.attributes as any,
            validation: result.validation as any,
            translationStatus: 'COMPLETED',
            attributeStatus: 'COMPLETED',
            validationStatus: 'COMPLETED',
            validationResult: this.mapValidationResult(result.validation) as any,
          },
        });

        return result;
      });

      // 2. 価格計算
      await this.recordStep(taskId, 'PRICE_CALCULATION', 2, async () => {
        const pricing = await this.priceCalculator.calculatePrice(task.product.price);

        await prisma.enrichmentTask.update({
          where: { id: taskId },
          data: {
            pricing: pricing as any,
          },
        });

        return pricing;
      });

      // 最終ステータスを更新
      const finalTask = await prisma.enrichmentTask.findUnique({
        where: { id: taskId },
      });

      const finalStatus = this.determineFinalStatus(finalTask?.validationResult as string);

      await prisma.enrichmentTask.update({
        where: { id: taskId },
        data: {
          status: finalStatus as any,
          completedAt: new Date(),
          duration: Date.now() - startTime,
        },
      });

      log.info({
        type: 'task_completed',
        taskId,
        status: finalStatus,
        duration: Date.now() - startTime,
      });
    } catch (error: any) {
      await prisma.enrichmentTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          lastError: error.message,
          errorCount: { increment: 1 },
        },
      });

      log.error({
        type: 'task_failed',
        taskId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * ステップを記録して実行
   */
  private async recordStep<T>(
    taskId: string,
    stepType: string,
    stepOrder: number,
    executor: () => Promise<T>
  ): Promise<T> {
    const step = await prisma.enrichmentStep.create({
      data: {
        taskId,
        stepType: stepType as any,
        stepOrder,
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    try {
      const result = await executor();

      await prisma.enrichmentStep.update({
        where: { id: step.id },
        data: {
          status: 'COMPLETED',
          output: result as any,
          completedAt: new Date(),
          duration: Date.now() - step.startedAt!.getTime(),
        },
      });

      return result;
    } catch (error: any) {
      await prisma.enrichmentStep.update({
        where: { id: step.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * 検証結果をマッピング
   */
  private mapValidationResult(validation: ValidationResult): string {
    if (validation.severity === 'critical' || validation.severity === 'high') {
      return 'REJECTED';
    }
    if (validation.severity === 'medium' || validation.flags.length > 0) {
      return 'REVIEW_REQUIRED';
    }
    return 'APPROVED';
  }

  /**
   * 最終ステータスを決定
   */
  private determineFinalStatus(validationResult: string): string {
    switch (validationResult) {
      case 'APPROVED':
        return 'APPROVED';
      case 'REJECTED':
        return 'REJECTED';
      case 'REVIEW_REQUIRED':
        return 'READY_TO_REVIEW';
      default:
        return 'READY_TO_REVIEW';
    }
  }

  /**
   * 保留中のタスクを取得
   */
  async getPendingTasks(limit: number = 10): Promise<any[]> {
    return prisma.enrichmentTask.findMany({
      where: {
        status: 'PENDING',
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: limit,
      include: {
        product: true,
      },
    });
  }

  /**
   * レビュー待ちタスクを取得
   */
  async getReviewTasks(limit: number = 50): Promise<any[]> {
    return prisma.enrichmentTask.findMany({
      where: {
        status: 'READY_TO_REVIEW',
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        product: true,
      },
    });
  }

  /**
   * タスクを承認
   */
  async approveTask(taskId: string): Promise<void> {
    await prisma.enrichmentTask.update({
      where: { id: taskId },
      data: {
        status: 'APPROVED',
        validationResult: 'APPROVED',
      },
    });

    log.info({ type: 'task_approved', taskId });
  }

  /**
   * タスクを却下
   */
  async rejectTask(taskId: string, reason: string): Promise<void> {
    await prisma.enrichmentTask.update({
      where: { id: taskId },
      data: {
        status: 'REJECTED',
        validationResult: 'REJECTED',
        validation: {
          passed: false,
          flags: ['manual_rejection'],
          reviewNotes: reason,
          severity: 'high',
        } as any,
      },
    });

    log.info({ type: 'task_rejected', taskId, reason });
  }
}

// シングルトンインスタンス
export const translatorService = new TranslatorService();
export const attributeExtractorService = new AttributeExtractorService();
export const contentValidatorService = new ContentValidatorService();
export const priceCalculatorService = new PriceCalculatorService();
export const enrichmentTaskManager = new EnrichmentTaskManager();

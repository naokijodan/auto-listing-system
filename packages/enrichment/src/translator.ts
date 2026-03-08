/**
 * Phase 40-A: 翻訳エンジン
 * GPT-4oを使用した日英翻訳
 */
import OpenAI from 'openai';
import { logger } from '@rakuda/logger';
import { prisma } from '@rakuda/database';

const log = logger.child({ module: 'enrichment/translator' });

// OpenAIクライアント（遅延初期化）
let openai: OpenAI | null = null;
let openaiInitialized = false;

async function getApiKeyFromDB(): Promise<string | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'openai_api_key' },
    });
    return setting?.value || null;
  } catch {
    return null;
  }
}

export async function getOpenAIClient(): Promise<OpenAI | null> {
  if (!openaiInitialized) {
    openaiInitialized = true;
    const apiKey = (await getApiKeyFromDB()) || process.env.OPENAI_API_KEY;
    if (apiKey) {
      openai = new OpenAI({ apiKey });
    }
  }
  return openai;
}

function getModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o';
}

/**
 * 翻訳結果
 */
export interface TranslationResult {
  en: {
    title: string;
    description: string;
  };
  tokensUsed: number;
}

/**
 * 統合翻訳結果（翻訳+属性+検証を含む）
 */
export interface EnrichmentResult {
  translations: TranslationResult;
  attributes: {
    brand?: string;
    color?: string;
    size?: string;
    material?: string;
    condition?: 'new' | 'like_new' | 'good' | 'fair';
    category?: string;
    itemSpecifics: Record<string, string>;
    confidence: number;
    // --- Joom固有/追加属性 ---
    weightGrams?: number;        // 推定重量（グラム）
    movementType?: string;       // 時計: Automatic, Quartz, Mechanical, Solar
    caseMaterial?: string;       // 時計: Stainless Steel, Titanium, Gold etc
    bandMaterial?: string;       // 時計: Leather, Metal, Rubber etc
    waterResistance?: string;    // 時計: 30m, 50m, 100m, 200m etc
    displayType?: string;        // スマートウォッチ: LCD, OLED, AMOLED
    gender?: string;             // mens, womens, unisex
    countryOfOrigin?: string;    // 製造国: Japan, Switzerland etc
  };
  validation: {
    isSafe: boolean;
    status: 'approved' | 'rejected' | 'review_required';
    flags: string[];
    reviewNotes?: string;
  };
  tokensUsed: number;
}

/**
 * 翻訳・属性抽出・検証を一括で実行するプロンプト
 */
const ENRICHMENT_SYSTEM_PROMPT = `あなたは越境EC商品データの専門家です。
日本語の商品情報を分析し、以下の3つのタスクを同時に実行してください。

1. **翻訳**: 自然で商品説明として適切な英語に翻訳
2. **属性抽出**: 商品の構造化属性を抽出
3. **禁制品チェック**: 国際配送における禁制品・リスクを判定

【注意事項】
- 翻訳は直訳ではなく、海外バイヤーに魅力的に伝わる表現を心がける
- ブランド名は原文のまま維持
- 日本語特有の表現は適切に意訳
- SEOを意識したキーワードを含める
- 禁制品判定は厳格に行う（電池、危険物、ワシントン条約対象、偽ブランド品）
- 時計に関して: ソーラー駆動（Seiko Solar 等）、Eco-Drive、Kinetic などの自己充電式・蓄電式（コンデンサ/キャパシタ）駆動は「電池含有」としてフラグしない。
- Do not flag products as containing batteries if they use solar power, Eco-Drive, kinetic, or similar rechargeable/self-charging mechanisms.`;

const ENRICHMENT_USER_PROMPT = `以下の日本語商品情報を分析してください。

【商品情報】
タイトル: {{title}}

説明文:
{{description}}

カテゴリ: {{category}}

【出力形式（JSON）】
{
  "translations": {
    "en": { "title": "英語タイトル", "description": "英語説明文" }
  },
  "attributes": {
    "brand": "ブランド名（推測できる場合）",
    "color": "色",
    "size": "サイズ",
    "material": "素材",
    "condition": "new|like_new|good|fair",
    "category": "推定カテゴリ",
    "weightGrams": 150,
    "movementType": "Automatic|Quartz|Mechanical|Solar",
    "caseMaterial": "Stainless Steel|Titanium|Gold|Ceramic|Plastic|Resin|Alloy",
    "bandMaterial": "Leather|Metal|Rubber|Silicone|Nylon|Resin",
    "waterResistance": "例: 30m, 50m, 100m, 200m",
    "displayType": "例: LCD, OLED, AMOLED",
    "gender": "mens|womens|unisex",
    "countryOfOrigin": "製造国（例: Japan, Switzerland）",
    "itemSpecifics": {
      "Type": "商品タイプ",
      "Style": "スタイル"
    },
    "confidence": 0.85
  },
  "validation": {
    "isSafe": true,
    "status": "approved|rejected|review_required",
    "flags": ["検出されたリスク"],
    "reviewNotes": "人間確認が必要な場合のメモ"
  }
}

【属性抽出の詳細ルール】
- weightGrams: 商品の推定重量をグラムで返す（梱包を含む）。時計は概ね80-300g、フィギュアは200-1000g、衣類は200-600gなど妥当な範囲で見積もる。
- 時計カテゴリの場合: movementType, caseMaterial, bandMaterial, waterResistance を積極的に抽出。
- displayType: スマートウォッチ・電子機器で表示方式（LCD/OLED/AMOLEDなど）を抽出。
- gender: mens/womens/unisex のいずれかで返す（該当ない場合は省略可）。
- countryOfOrigin: 製造国を返す（ブランド本社所在地ではなく、実際の製造国）。
- 新しいフィールドが不明な場合は省略して良い。

【禁制品判定基準】
- rejected: 電池含有、リチウムイオン、可燃物、スプレー缶、象牙・べっ甲、武器類、アダルト
- review_required: 商標侵害リスク、医薬品・サプリメント、高額ブランド品
- approved: 上記に該当しない`;

// カテゴリに応じたプロンプト解決ヘルパー
interface ResolvedPrompt {
  systemPrompt: string;
  userPrompt: string;
  source: 'db_category' | 'db_default' | 'hardcoded';
}

async function resolvePrompt(category?: string): Promise<ResolvedPrompt> {
  try {
    // 1. カテゴリ指定がある場合、カテゴリ別プロンプトを検索
    if (category) {
      const categoryPrompt = await prisma.translationPrompt.findFirst({
        where: {
          category: category,
          isActive: true,
        },
        orderBy: { priority: 'desc' },
      });
      if (categoryPrompt) {
        return {
          systemPrompt: categoryPrompt.systemPrompt,
          userPrompt: categoryPrompt.userPrompt,
          source: 'db_category',
        };
      }
    }

    // 2. デフォルトプロンプトを検索
    const defaultPrompt = await prisma.translationPrompt.findFirst({
      where: { isDefault: true, isActive: true },
      orderBy: { priority: 'desc' },
    });
    if (defaultPrompt) {
      return {
        systemPrompt: defaultPrompt.systemPrompt,
        userPrompt: defaultPrompt.userPrompt,
        source: 'db_default',
      };
    }
  } catch (error: any) {
    log.warn({ type: 'prompt_db_lookup_failed', error: error.message, category });
  }

  // 3. フォールバック: ハードコードされた汎用プロンプト
  return {
    systemPrompt: ENRICHMENT_SYSTEM_PROMPT,
    userPrompt: ENRICHMENT_USER_PROMPT,
    source: 'hardcoded',
  };
}

/**
 * 商品情報の翻訳・属性抽出・検証を一括実行
 */
export async function enrichProduct(
  title: string,
  description: string,
  category?: string
): Promise<EnrichmentResult> {
  // OpenAI APIキーが設定されていない場合はフォールバック
  const client = await getOpenAIClient();
  if (!client) {
    log.warn({ type: 'openai_not_configured' });
    return createFallbackResult(title, description);
  }

  // カテゴリに応じたプロンプトをDBから取得
  const prompt = await resolvePrompt(category);

  const userPrompt = prompt.userPrompt
    .replace('{{title}}', title)
    .replace('{{description}}', description)
    .replace('{{category}}', category || '不明');

  try {
    log.info({
      type: 'enrichment_start',
      titleLength: title.length,
      descriptionLength: description.length,
      model: getModel(),
      promptSource: prompt.source,
      category: category || 'none',
    });

    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    const tokensUsed = response.usage?.total_tokens || 0;

    log.info({
      type: 'enrichment_complete',
      tokensUsed,
      validationStatus: parsed.validation?.status,
      flags: parsed.validation?.flags,
    });

    return {
      translations: {
        en: parsed.translations?.en || { title: `${title}`, description: `${description}` },
        tokensUsed,
      },
      attributes: {
        brand: parsed.attributes?.brand,
        color: parsed.attributes?.color,
        size: parsed.attributes?.size,
        material: parsed.attributes?.material,
        condition: parsed.attributes?.condition,
        category: parsed.attributes?.category,
        itemSpecifics: parsed.attributes?.itemSpecifics || {},
        confidence: parsed.attributes?.confidence || 0.5,
        weightGrams: parsed.attributes?.weightGrams,
        movementType: parsed.attributes?.movementType,
        caseMaterial: parsed.attributes?.caseMaterial,
        bandMaterial: parsed.attributes?.bandMaterial,
        waterResistance: parsed.attributes?.waterResistance,
        displayType: parsed.attributes?.displayType,
        gender: parsed.attributes?.gender,
        countryOfOrigin: parsed.attributes?.countryOfOrigin,
      },
      validation: {
        isSafe: parsed.validation?.isSafe ?? true,
        status: parsed.validation?.status || 'review_required',
        flags: parsed.validation?.flags || [],
        reviewNotes: parsed.validation?.reviewNotes,
      },
      tokensUsed,
    };
  } catch (error: any) {
    log.error({
      type: 'enrichment_error',
      error: error.message,
    });

    return createFallbackResult(title, description);
  }
}

/**
 * 英語のみの翻訳（軽量版）
 */
export async function translateToEnglish(
  title: string,
  description: string
): Promise<{ title: string; description: string; tokensUsed: number }> {
  const prompt = `Translate the following Japanese product information to natural, SEO-friendly English:

Title: ${title}

Description:
${description}

Return JSON: {"title": "...", "description": "..."}`;

  try {
    const client = await getOpenAIClient();
    if (!client) {
      throw new Error('OpenAI not configured');
    }

    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: 'You are an expert e-commerce product translator.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response');

    const parsed = JSON.parse(content);
    return {
      title: parsed.title || title,
      description: parsed.description || description,
      tokensUsed: response.usage?.total_tokens || 0,
    };
  } catch (error: any) {
    log.error({ type: 'translate_en_error', error: error.message });
    return {
      title: title,
      description: description,
      tokensUsed: 0,
    };
  }
}

/**
 * フォールバック結果を生成
 */
function createFallbackResult(title: string, description: string): EnrichmentResult {
  return {
    translations: {
      // フォールバック時は英訳は空にする（原文は入れない）
      en: { title: '', description: '' },
      tokensUsed: 0,
    },
    attributes: {
      itemSpecifics: {},
      confidence: 0,
    },
    validation: {
      isSafe: true,
      status: 'review_required',
      // 翻訳失敗フラグを追加
      flags: ['openai_not_configured', 'translation_failed'],
      reviewNotes: 'OpenAI APIが設定されていないため、手動確認が必要です',
    },
    tokensUsed: 0,
  };
}

/**
 * OpenAI APIキーが設定されているか確認
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

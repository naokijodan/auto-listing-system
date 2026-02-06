# Phase 40: Joom出品ワークフロー設計書

**作成日**: 2026-02-07
**ステータス**: 設計完了・実装待ち

## 概要

RAKUDAのJoom出品機能を実装する。単なるAPI連携ではなく、**データ構造化・適合化エンジン（Content Enrichment Engine）**として設計する。

## 3者協議による設計方針

### コンセンサス

1. **データ品質が最重要** - API接続より「データの生成・整形・検証」が主戦場
2. **属性の構造化** - Joomの検索アルゴリズムは構造化属性を重視
3. **画像の中間バッファ** - 元サイトのリンク切れ対策として自社ストレージに保存
4. **事前検閲** - 禁制品・知的財産権侵害によるBAN対策

---

## アーキテクチャ

### ディレクトリ構成

```
apps/api/src/services/
├── joom/
│   ├── client.ts           # Joom API クライアント
│   ├── products.ts         # 商品CRUD
│   ├── images.ts           # 画像アップロード
│   └── orders.ts           # 注文管理
├── enrichment/
│   ├── translator.ts       # 翻訳エンジン
│   ├── attribute-extractor.ts  # 属性抽出
│   ├── content-validator.ts    # 禁制品チェック
│   └── price-calculator.ts     # 価格計算
└── assets/
    ├── image-downloader.ts # 画像ダウンロード
    ├── image-optimizer.ts  # 画像最適化
    └── storage.ts          # S3/MinIO保存

apps/worker/src/workers/
├── translate-worker.ts     # 翻訳・属性抽出・検閲
├── image-worker.ts         # 画像処理
└── joom-publish-worker.ts  # Joom出品
```

### 正規化商品モデル（Canonical Product Model）

```typescript
interface RakudaProduct {
  id: string;

  // ステータス
  status: ProductStatus;
  enrichmentStatus: {
    translation: 'pending' | 'processing' | 'completed' | 'error';
    attributes: 'pending' | 'processing' | 'completed' | 'error';
    validation: 'pending' | 'approved' | 'rejected' | 'review_required';
    images: 'pending' | 'processing' | 'completed' | 'error';
  };

  // 元データ
  source: {
    type: 'yahoo_auction' | 'mercari' | 'amazon';
    url: string;
    itemId: string;
    title: string;
    description: string;
    price: number;
    images: string[];  // 元URL
  };

  // 構造化属性（AI抽出）
  attributes: {
    brand?: string;
    color?: string;
    size?: string;
    material?: string;
    condition?: string;
    category?: string;
    itemSpecifics: Record<string, string>;  // Joom用
    confidence: number;  // 0-1
  };

  // 翻訳済みコンテンツ
  translations: {
    en: { title: string; description: string };
    ru?: { title: string; description: string };
  };

  // 画像アセット
  assets: {
    originalImages: string[];   // 元URL
    bufferedImages: string[];   // S3/MinIO URL
    optimizedImages: string[];  // 最適化済みURL
  };

  // 価格計算
  pricing: {
    costJpy: number;           // 仕入れ価格（円）
    exchangeRate: number;      // 為替レート
    profitRate: number;        // 利益率
    shippingCost: number;      // 送料
    platformFee: number;       // Joom手数料
    finalPriceUsd: number;     // 最終販売価格（USD）
  };

  // 検閲結果
  validation: {
    passed: boolean;
    flags: string[];           // 検出された問題
    reviewNotes?: string;
  };

  // Joom連携
  joom?: {
    productId?: string;
    listingUrl?: string;
    lastSyncedAt?: string;
  };
}
```

---

## パイプライン設計

### フロー図

```
┌─────────────────────────────────────────────────────────────────┐
│                    RAKUDA 出品パイプライン                        │
└─────────────────────────────────────────────────────────────────┘

[Chrome拡張] → [Product登録]
                    │
                    ▼
            ┌───────────────┐
            │  事前チェック   │ ← キーワードフィルタ（高速）
            └───────┬───────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
    [translate-queue]     [image-queue]
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│  AI処理Worker    │   │  画像Worker      │
│ ・多言語翻訳     │   │ ・ダウンロード   │
│ ・属性抽出       │   │ ・最適化        │
│ ・禁制品判定     │   │ ・S3保存        │
└────────┬────────┘   └────────┬────────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
            ┌───────────────┐
            │ バリデーション  │ ← 両方完了を確認
            └───────┬───────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
   [approved]            [review_required]
         │                     │
         ▼                     ▼
  [joom-publish-queue]   [管理画面で確認]
         │
         ▼
┌─────────────────┐
│  Joom出品Worker  │
│ ・商品作成       │
│ ・画像紐付け     │
│ ・価格設定       │
└─────────────────┘
         │
         ▼
      [完了]
```

### ステータス遷移

```
pending_scrape
    ↓
translating ←─────────────────┐
    ↓                         │ (リトライ)
processing_image ←────────────┤
    ↓                         │
ready_to_review               │
    ↓                         │
    ├── approved ─────────────┤
    │       ↓                 │
    │   publishing ───────────┘
    │       ↓
    │    active ──→ sold
    │              out_of_stock
    │
    └── rejected (BAN対象)
        review_required (要確認)
```

### エラーハンドリング

| ステージ | 失敗時の扱い | リトライ上限 |
|---------|-------------|-------------|
| 翻訳 | pending_translation に戻す | 3回 |
| 画像DL | 元URL無効フラグ、プレースホルダー使用 | 3回 |
| 画像最適化 | オリジナル画像をそのまま使用 | 1回 |
| 禁制品判定 | review_required にして人間確認 | - |
| Joom出品 | publishing_error、手動リトライ | 3回 |

---

## 実装詳細

### 1. 翻訳・属性抽出（LLM）

```typescript
// apps/api/src/services/enrichment/translator.ts

const TRANSLATION_PROMPT = `
あなたは越境EC商品データの専門家です。
以下の日本語商品情報を分析し、JSON形式で出力してください。

【入力】
タイトル: {title}
説明文: {description}
カテゴリ: {category}

【出力形式】
{
  "translations": {
    "en": { "title": "...", "description": "..." },
    "ru": { "title": "...", "description": "..." }
  },
  "attributes": {
    "brand": "...",
    "color": "...",
    "size": "...",
    "material": "...",
    "condition": "new|like_new|good|fair",
    "itemSpecifics": { ... }
  },
  "validation": {
    "isSafe": true/false,
    "flags": ["prohibited_item", "trademark", "battery", ...]
  }
}

【注意事項】
- 翻訳は自然で商品説明として適切な表現にする
- 属性は元データから推測できるもののみ抽出
- 禁制品（電池、可燃物、ワシントン条約対象）をチェック
- ブランド名の商標侵害リスクを判定
`;
```

### 2. 画像処理

```typescript
// apps/api/src/services/assets/image-optimizer.ts

interface ImageProcessingOptions {
  maxWidth: 1200;
  maxHeight: 1200;
  format: 'webp' | 'jpeg';
  quality: 85;
  background: 'white' | 'transparent';
}

async function processImage(sourceUrl: string, options: ImageProcessingOptions) {
  // 1. ダウンロード（タイムアウト30秒）
  // 2. フォーマット検証
  // 3. リサイズ（アスペクト比維持）
  // 4. 背景処理（Joom推奨: 白背景）
  // 5. S3/MinIOにアップロード
  // 6. CDN URLを返す
}
```

### 3. 価格計算

```typescript
// apps/api/src/services/enrichment/price-calculator.ts

interface PricingConfig {
  baseProfitRate: number;      // デフォルト: 0.3 (30%)
  minProfitRate: number;       // 最低: 0.15 (15%)
  maxProfitRate: number;       // 最高: 0.5 (50%)

  shippingCostJpy: number;     // 固定送料（円）
  shippingCostUsd: number;     // 固定送料（USD）

  joomFeeRate: number;         // Joom手数料率: 0.15 (15%)
  paymentFeeRate: number;      // 決済手数料: 0.029 (2.9%)
}

function calculatePrice(
  costJpy: number,
  exchangeRate: number,
  config: PricingConfig
): PricingResult {
  const costUsd = costJpy / exchangeRate;
  const basePrice = costUsd * (1 + config.baseProfitRate);
  const withFees = basePrice / (1 - config.joomFeeRate - config.paymentFeeRate);
  const finalPrice = withFees + config.shippingCostUsd;

  return {
    costJpy,
    costUsd,
    exchangeRate,
    profitRate: config.baseProfitRate,
    platformFee: finalPrice * config.joomFeeRate,
    paymentFee: finalPrice * config.paymentFeeRate,
    shippingCost: config.shippingCostUsd,
    finalPriceUsd: Math.ceil(finalPrice * 100) / 100,  // 切り上げ
  };
}
```

### 4. Joom API クライアント

```typescript
// apps/api/src/services/joom/client.ts

class JoomClient {
  private baseUrl = 'https://api-merchant.joom.com/api/v3';

  constructor(private accessToken: string) {}

  async createProduct(data: JoomProductPayload): Promise<JoomProduct> {
    return this.request('POST', '/products', data);
  }

  async updateProduct(id: string, data: Partial<JoomProductPayload>) {
    return this.request('PUT', `/products/${id}`, data);
  }

  async uploadImage(productId: string, imageUrl: string) {
    return this.request('POST', `/products/${productId}/images`, { url: imageUrl });
  }

  async getOrders(status?: string) {
    return this.request('GET', '/orders', { status });
  }
}
```

---

## Dry-Runモード

実際に出品する前に、全プロセスをシミュレーションできるモードを実装する。

```typescript
// POST /api/products/:id/preview-joom
{
  "dryRun": true
}

// Response
{
  "wouldCreate": {
    "title": "Vintage Japanese Watch - Seiko 5",
    "description": "...",
    "price": 45.99,
    "images": ["https://cdn.rakuda.app/..."],
    "attributes": { ... }
  },
  "validation": {
    "passed": true,
    "warnings": ["Price might be too low for this category"]
  },
  "estimatedVisibility": "high"  // SEOスコア
}
```

---

## 禁制品チェックリスト

| カテゴリ | 例 | 判定 |
|---------|-----|------|
| 電池 | リチウムイオン、ボタン電池 | rejected |
| 危険物 | 可燃物、スプレー缶 | rejected |
| ワシントン条約 | 象牙、べっ甲 | rejected |
| 商標侵害リスク | 偽ブランド品の疑い | review_required |
| 成人向け | アダルト商品 | rejected |
| 医薬品 | サプリメント含む | review_required |
| 武器 | ナイフ、銃器類 | rejected |

---

## 実装優先順位

### Phase 40-A: Core Logic（翻訳・属性抽出）
1. `enrichment/translator.ts` - GPT-4oプロンプト設計
2. `enrichment/attribute-extractor.ts` - 構造化データ抽出
3. `enrichment/content-validator.ts` - 禁制品判定
4. `translate-worker.ts` - BullMQワーカー

### Phase 40-B: Asset Manager（画像処理）
1. `assets/image-downloader.ts` - 画像ダウンロード
2. `assets/image-optimizer.ts` - リサイズ・最適化
3. `assets/storage.ts` - S3/MinIO保存
4. `image-worker.ts` - BullMQワーカー

### Phase 40-C: Joom Connector（API連携）
1. `joom/client.ts` - APIクライアント
2. `joom/products.ts` - 商品CRUD
3. `joom-publish-worker.ts` - 出品ワーカー
4. Dry-Runモード実装

### Phase 40-D: UI & 運用
1. 商品プレビュー画面
2. 禁制品レビュー画面
3. 一括出品機能
4. 出品履歴・統計

---

## 環境変数

```env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# S3/MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=rakuda-images

# Joom
JOOM_CLIENT_ID=...
JOOM_CLIENT_SECRET=...
JOOM_ACCESS_TOKEN=...  # OAuth取得済み
JOOM_REFRESH_TOKEN=...

# 価格設定
DEFAULT_PROFIT_RATE=0.3
DEFAULT_SHIPPING_COST_USD=5.00
JOOM_FEE_RATE=0.15
```

---

## テスト計画

| テスト種類 | 対象 | カバレッジ目標 |
|-----------|------|---------------|
| 単体テスト | 価格計算、属性抽出 | 90% |
| 統合テスト | パイプライン全体 | 80% |
| E2Eテスト | 出品フロー | 主要パス |
| モックテスト | Joom API | 全エンドポイント |

---

## 見積もり

| フェーズ | 内容 |
|---------|------|
| 40-A | 翻訳・属性抽出エンジン |
| 40-B | 画像処理パイプライン |
| 40-C | Joom API連携 |
| 40-D | UI・運用機能 |

---

## 参考リンク

- [Joom Merchant API Documentation](https://merchant-api.joom.com/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)

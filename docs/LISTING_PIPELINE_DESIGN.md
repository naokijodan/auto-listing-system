# 出品パイプライン全体設計書

作成日: 2026-03-07 (Session 14 3者協議に基づく)

## 背景

RAKUDAの出品パイプラインには以下の問題がある:
1. 画像がeBay出品に渡されていない（2つのパイプラインが競合）
2. 翻訳が汎用プロンプト1つだけ（カテゴリ別専門プロンプトが未統合）
3. ItemSpecifics抽出がGASにしかない（RAKUDAに未移植）
4. 出品前の品質チェックがない（画像なし・翻訳失敗でも出品される）

## Phase一覧

| Phase | 内容 | 優先度 | 依存 |
|-------|------|--------|------|
| Phase 1 | APIキー設定UI + DB保存 | **完了** | - |
| Phase 2 | 画像パイプライン修正 | **完了** | - |
| Phase 3 | translator.tsカテゴリ別プロンプト対応 | **完了** | Phase 1 |
| Phase 4 | 主力プロンプトDB投入 | **完了**（シードスクリプト作成済、本番実行待ち） | Phase 3 |
| Phase 5 | ItemSpecifics統合 + ブランド辞書DB化 | **完了**（シードスクリプト作成済、本番実行待ち） | Phase 3 |
| Phase 6 | 品質チェックゲート | **完了** | Phase 2,3 |

## 理想的なパイプラインフロー（完成後）

```
商品登録（Product作成）
  ↓
画像処理（ダウンロード→最適化→S3アップロード）
  ↓
翻訳（カテゴリ別プロンプトでタイトル・説明文を英語化）
  ↓
ItemSpecifics抽出（ルールベース→AI 2段階）
  ↓
品質チェックゲート（画像・翻訳・ItemSpecifics・価格の検証）
  ↓ PASS → 出品（eBay/Joom/Shopify等）
  ↓ FAIL → REVIEW_REQUIRED（ユーザー確認待ち）
```

---

## Phase 2: 画像パイプライン修正

### 問題の詳細

#### 2つの競合パイプライン
- パイプライン①: `apps/worker/src/processors/image.ts` → `Product.processedImages`
- パイプライン②: `ImagePipelineService`（joom-publish-service.ts内） → `EnrichmentTask.optimizedImages`

#### ebay-publish-service.tsの画像優先順位（130-133行目）
```typescript
const optimizedImages = task.optimizedImages?.length > 0
  ? task.optimizedImages              // 1st: EnrichmentTask.optimizedImages
  : (product.processedImages.length > 0
     ? product.processedImages        // 2nd: Product.processedImages
     : product.images);               // 3rd: Product.images（元URL）
```

#### 欠陥
1. Product.imagesが空の場合、processImagesForListing()がエラー → 全フォールバック失敗
2. processImagesForListing()にtry-catchがない → エラーがpropagateされる
3. 出品前の画像有無チェックがない

### 修正方針（3者協議で合意）

1. **パイプライン②に一本化**: 出品時の画像参照先はEnrichmentTask.optimizedImagesに固定
2. **フォールバック維持**: Product.imagesを最終防衛ライン（サーキットブレーカー的）に保持
3. **エラーハンドリング強化**: processImagesForListing()にtry-catch追加
4. **出品前ガード**: 画像0枚の場合は出品をブロック

### 修正対象ファイル

| ファイル | 修正内容 |
|---------|---------|
| `apps/worker/src/lib/ebay-publish-service.ts` | processImagesForListing()のエラーハンドリング追加。画像0枚ガード |
| `apps/worker/src/jobs/ebay-publish-worker.ts` | processImagesForListing()失敗時のフォールバック（Product.images使用） |
| `apps/worker/src/lib/image-processor.ts` | processImages()で空配列を受けた場合の早期リターン |

### 具体的な修正内容

#### ebay-publish-service.ts (processImagesForListing)
```typescript
async processImagesForListing(listingId: string): Promise<void> {
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    include: { product: true, enrichmentTask: true },
  });

  const product = listing.product;
  const task = listing.enrichmentTask;

  // 元画像がない場合は早期リターン（ログのみ）
  if (!product.images || product.images.length === 0) {
    log.warn({ type: 'no_source_images', productId: product.id });
    return;
  }

  try {
    const imageResult = await imagePipelineService.processImages(
      product.id,
      product.images
    );

    await prisma.enrichmentTask.update({
      where: { id: task.id },
      data: {
        bufferedImages: imageResult.buffered,
        optimizedImages: imageResult.optimized,
        imageStatus: 'COMPLETED',
      },
    });
  } catch (error: any) {
    log.error({
      type: 'image_processing_failed',
      productId: product.id,
      error: error.message,
    });

    // フォールバック: Product.imagesをそのまま使用
    if (task) {
      await prisma.enrichmentTask.update({
        where: { id: task.id },
        data: {
          optimizedImages: product.images,
          imageStatus: 'FALLBACK',
        },
      });
    }
  }
}
```

#### publishToEbay内の画像ガード
```typescript
// 出品前チェック
const imageUrls = optimizedImages.length > 0
  ? optimizedImages.slice(0, 12)
  : product.images.slice(0, 12);  // 最終フォールバック

if (imageUrls.length === 0) {
  throw new Error('Cannot publish to eBay without images. At least 1 image is required.');
}
```

---

## Phase 3: translator.tsカテゴリ別プロンプト対応

### 修正方針
現在の汎用プロンプト（ENRICHMENT_SYSTEM_PROMPT/ENRICHMENT_USER_PROMPT）を、
DBのTranslationPromptテーブルから商品カテゴリに応じて取得する形に変更。

### 修正対象ファイル
| ファイル | 修正内容 |
|---------|---------|
| `packages/enrichment/src/translator.ts` | enrichProduct()にカテゴリ引数追加。DBからプロンプト取得ロジック |

### 具体的な修正内容

```typescript
export async function enrichProduct(
  title: string,
  description: string,
  category?: string
): Promise<EnrichmentResult> {
  const client = await getOpenAIClient();
  if (!client) {
    log.warn({ type: 'openai_not_configured' });
    return createFallbackResult(title, description);
  }

  // カテゴリに応じたプロンプトをDBから取得
  let prompt: { systemPrompt: string; userPrompt: string } | null = null;

  if (category) {
    const dbPrompt = await prisma.translationPrompt.findFirst({
      where: {
        category: category,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });
    if (dbPrompt) {
      prompt = { systemPrompt: dbPrompt.systemPrompt, userPrompt: dbPrompt.userPrompt };
    }
  }

  // DBにない場合は汎用プロンプト（フォールバック）
  if (!prompt) {
    const defaultPrompt = await prisma.translationPrompt.findFirst({
      where: { isDefault: true, isActive: true },
    });
    prompt = defaultPrompt
      ? { systemPrompt: defaultPrompt.systemPrompt, userPrompt: defaultPrompt.userPrompt }
      : { systemPrompt: ENRICHMENT_SYSTEM_PROMPT, userPrompt: ENRICHMENT_USER_PROMPT };
  }

  const userPrompt = prompt.userPrompt
    .replace('{{title}}', title)
    .replace('{{description}}', description)
    .replace('{{category}}', category || '不明');

  // ... 以下は現在と同じOpenAI API呼び出し
}
```

---

## Phase 4: 主力プロンプトDB投入

### 投入するプロンプト

| カテゴリ | ソースファイル | 優先度 |
|---------|-------------|--------|
| 時計（Watches） | `ツール開発/一括シートApps_v3/プロンプト例/時計専用.txt` + `ガイド・ドキュメント/プロンプト編集/時計プロンプトV2` | 最高 |
| ポケモンカード（Trading Cards） | `ガイド・ドキュメント/プロンプト編集/ポケカプロンプトV9` | 最高 |
| ジュエリー（Jewelry） | `ガイド・ドキュメント/プロンプト編集/ジュエリー専用プロンプト` | 高 |
| フィギュア（Collectibles） | `ツール開発/一括シートApps_v3/プロンプト例/フィギュア用.txt` | 高 |
| ゲーム（Video Games） | `ツール開発/一括シートApps_v3/プロンプト例/ゲーム用.txt` | 中 |
| ハイブランド（Designer） | `ツール開発/一括シートApps_v3/プロンプト例/ミドル〜ハイブランドアパレル・小物専用.txt` | 中 |
| 日本ブランド（Japanese Brands） | `ツール開発/一括シートApps_v3/プロンプト例/日本ブラント特化.txt` | 中 |
| 汎用（General） | `ツール開発/一括シートApps_v3/プロンプト例/一般・汎用.txt` | デフォルト |

### 投入方法
APIシードスクリプト（`packages/database/prisma/seed-prompts.ts`）を作成し、
各プロンプトファイルの内容をTranslationPromptテーブルにupsert。

### プロンプト変換ルール
既存のプロンプトは「日本語入力→英語出品データ出力」の形式。
TranslationPromptの`systemPrompt`と`userPrompt`にマッピング:
- systemPrompt: プロンプト全体（ロール定義+ルール+出力形式）
- userPrompt: `{{title}}` `{{description}}` `{{category}}` のプレースホルダー付きテンプレート

---

## Phase 5: ItemSpecifics統合 + ブランド辞書DB化

### ItemSpecifics統合

#### ソース
- `ツール開発/一括シートApps_v3/ItemSpecifics/` のGASコード（3,729行）
- 2段階抽出: ルールベース（Step1）→ AI抽出（Step2）

#### RAKUDAへの移植方針

新規パッケージ: `packages/enrichment/src/item-specifics/`

```
packages/enrichment/src/item-specifics/
  ├── index.ts              # エントリポイント
  ├── rule-extractor.ts     # Step 1: ルールベース抽出（Brand, Country, Type）
  ├── ai-extractor.ts       # Step 2: AI抽出（残り項目）
  ├── brand-dictionary.ts   # ブランド辞書参照
  ├── field-definitions.ts  # カテゴリ別フィールド定義
  └── post-processor.ts     # 後処理（時計Display推論、金属誤認補正等）
```

#### Step 1: ルールベース抽出
- ブランド辞書マッチング（日本語名→英語名+製造国）
- パターン辞書マッチング（金属、宝石、色、素材等）
- タグ→カテゴリマッピング

#### Step 2: AI抽出
- Step 1の結果を保持しつつ、残りフィールドをGPT-4oで抽出
- カテゴリ別のフィールド要件を動的にプロンプトに注入
- 正規化ルール（eBay標準値への変換）

### ブランド辞書DB化

新規テーブル（Prismaスキーマ追加）:
```prisma
model Brand {
  id          String   @id @default(cuid())
  name        String   @unique  // 英語名
  jpNames     String[]          // 日本語名（配列）
  country     String?           // 製造国
  parentBrand String?           // 親ブランド
  categories  String[]          // 対象カテゴリ
  isMaterial  Boolean  @default(false) // 素材ブランドか
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("brands")
}

model ItemSpecificsField {
  id        String @id @default(cuid())
  category  String            // eBayカテゴリ名
  tagJp     String            // 日本語タグ（カンマ区切り）
  fieldName String            // Item Specifics項目名
  fieldType String            // required / recommended
  priority  Int    @default(0)
  notes     String?           // AIへのヒント

  @@unique([category, fieldName])
  @@map("item_specifics_fields")
}
```

### 初期データ投入
- GASの`IS_BRAND_DICT`（約200ブランド）をBrandテーブルにシード
- GASの`IS_INITIAL_DATA`（12カテゴリ×93フィールド）をItemSpecificsFieldテーブルにシード

---

## Phase 6: 品質チェックゲート

### チェック項目

| チェック | 条件 | 失敗時の動作 |
|---------|------|------------|
| 画像チェック | imageUrls >= 1 | **ハードブロック**（出品不可） |
| タイトル翻訳チェック | `[EN]`プレフィックスがない | **ハードブロック** |
| 価格チェック | price > 0 | **ハードブロック** |
| 説明文翻訳チェック | `[EN]`プレフィックスがない | ソフトブロック（警告） |
| ItemSpecifics充足率 | required項目の80%以上 | ソフトブロック（警告） |
| ブランド名逆照合 | 元タイトルのブランド名が英語タイトルに含まれる | ソフトブロック |

### 実装場所
`apps/worker/src/lib/listing-quality-gate.ts`（新規）

### 呼び出し位置
各マーケットプレイスのpublish処理の直前に挿入:
- `ebay-publish-service.ts` の publishToEbay() 内
- `joom-publish-service.ts` の publishToJoom() 内

---

## 既存プロンプト資産の所在

| ディレクトリ | 内容 |
|------------|------|
| `~/Desktop/ツール開発/一括シートApps_v3/プロンプト例/` | 6カテゴリの出品プロンプト（時計、ゲーム、フィギュア、ハイブランド、日本ブランド、汎用） |
| `~/Desktop/ガイド・ドキュメント/プロンプト編集/` | 詳細プロンプト（ポケカV9、時計V2、ジュエリー、MTG、ベースボール、大相撲） |
| `~/Desktop/ツール開発/一括シートApps_v3/ItemSpecifics/` | ItemSpecifics AIシステム（設計書+GASコード 3,729行） |

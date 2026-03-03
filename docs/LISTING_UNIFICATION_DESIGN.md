# Listingテーブル統合設計書

Phase 0-C: JoomListing → 統合Listingへの移行計画
作成日: 2026-03-04

## 1. 統合スキーマ設計

### 推奨: Option A - marketplaceData（JSON）への統合

**理由:**
- Listing.marketplaceDataフィールドが既存
- マーケットプレイス追加時にスキーマ変更不要
- Zod discriminated unionで型安全に実装可能
- 7+マーケットプレイスへの拡張基盤

### 統合後のListing変更点

```prisma
model Listing {
  # 既存フィールドに加え、以下を追加
  publishedAt   DateTime?  # JoomのpublishedAtに相当
  lastSyncedAt  DateTime?  # JoomのlastSyncedAtに相当
}
```

### JoomListingデータの格納先: marketplaceData JSON

```json
{
  "marketplace": "JOOM",
  "joomProductId": "...",
  "joomVariantId": "...",
  "joomSku": "...",
  "title": "...",
  "description": "...",
  "quantity": 1,
  "joomCategory": "...",
  "joomAttributes": {},
  "joomImages": [],
  "shippingTime": "7-14 days",
  "dryRunResult": {}
}
```

## 2. マイグレーション計画

### Phase 0-C-1: 準備
1. Listing.marketplaceDataのJoom用Zodスキーマ定義
2. Listingに publishedAt, lastSyncedAt カラム追加

### Phase 0-C-2: データ移行
1. JoomListingデータをListingに変換・挿入
2. ステータスマッピング: DRAFT→DRAFT, READY→PENDING_PUBLISH, ACTIVE→ACTIVE等
3. 検証: JoomListing件数 == Listing(marketplace='JOOM')件数

### Phase 0-C-3: コード切り替え
1. prisma.joomListing.* → prisma.listing.*(where: {marketplace: 'JOOM'})
2. EnrichmentTask → Listing関連はproductIdで紐付け（独立化）

## 3. 影響範囲

### P0（即時対応）
| ファイル | 変更内容 |
|---------|---------|
| packages/database/prisma/schema.prisma | JoomListingモデル削除、Listing拡張 |
| apps/worker/src/lib/joom-publish-service.ts | prisma.joomListing → prisma.listing |
| apps/api/src/routes/joom.ts | prisma.joomListing → prisma.listing |
| apps/worker/src/processors/joom-publish.ts | JoomListing参照削除 |

### P1（Phase 1と並行）
| ファイル | 変更内容 |
|---------|---------|
| apps/worker/src/lib/price-adjuster.ts | marketplace判定修正 |
| apps/worker/src/lib/inventory-sync.ts | Listing統合 |
| apps/api/src/routes/marketplaces.ts | 統計クエリ修正 |
| apps/web/src/app/joom/page.tsx | APIルート変更対応 |

### P2（ドキュメント）
| ファイル | 変更内容 |
|---------|---------|
| docs/LISTING_FORMAT_PLAN.md | 統合設計反映 |
| docs/HANDOVER.md | 統合記述更新 |

## 4. Marketplace Enum

**変更不要** - JOOMは既にMarketplace enumに含まれている。

Zodスキーマの更新が必要:
```typescript
// packages/schema/src/listing.ts
export const MarketplaceSchema = z.enum([
  'joom', 'ebay', 'etsy', 'shopify', 'depop',
  'instagram_shop', 'tiktok_shop'
]);
```

## 5. EnrichmentTaskとの関連性

**推奨: 独立化（Option B）**
- EnrichmentTaskは翻訳・属性抽出の一時タスク管理用
- Listingとの関連はproductIdでのみ保持
- `enrichment_task.product_id == listing.product_id && listing.marketplace == 'JOOM'`

## 6. 実装工程（推定26時間）

| 工程 | タスク | 前提条件 |
|-----|--------|--------|
| P0-1 | Prismaスキーマ更新 | - |
| P0-2 | マイグレーション生成・テスト | P0-1 |
| P0-3 | JoomListingData Zod型定義 | - |
| P0-4 | joom-publish-service.ts修正 | P0-1, P0-3 |
| P0-5 | API routes/joom.ts修正 | P0-1 |
| P0-6 | プロセッサ修正 | P0-4 |
| P0-7 | テスト修正 | P0-4〜P0-6 |

## 7. リスク

| リスク | 対策 |
|--------|------|
| EnrichmentTaskリレーション破損 | 段階的ロールアウト |
| データ欠落 | バックアップ + 検証SQL |
| ダウンタイム | Blue-Greenデプロイ |

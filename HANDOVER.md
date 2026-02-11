# RAKUDA - 引継ぎ書

## 最終更新

**日付**: 2026-02-11
**Phase**: 55-56完了
**担当**: Claude

## 現在のステータス

### Phase 55-56: 仕入れ管理機能

**ステータス**: 完了 ✅

#### 実装内容

**Phase 55-56: 仕入れ管理**
1. 仕入れ管理API (`apps/api/src/routes/sourcing.ts`)
   - GET /api/sourcing/pending - 仕入れ待ち一覧
   - PATCH /api/sourcing/:orderId/status - ステータス更新
   - GET /api/sourcing/stats - 仕入れ統計
   - POST /api/sourcing/bulk-update - 一括ステータス更新

2. 仕入れ管理ページ (`apps/web/src/app/sourcing/page.tsx`)
   - 仕入れ待ち注文一覧（ステータス別フィルター）
   - ステータス更新フォーム（未確認→確認済み→発注済み→入荷済み）
   - 仕入れコスト入力
   - 仕入れ元URL表示（外部リンク）
   - 仕入れ統計ダッシュボード
   - マーケットプレイス別フィルター

3. APIクライアント更新 (`apps/web/src/lib/api.ts`)
   - `getPendingSourcing()` - 仕入れ待ち取得
   - `getSourcingStats()` - 仕入れ統計取得

4. SWRフック追加 (`apps/web/src/lib/hooks.ts`)
   - `usePendingSourcing()` - 仕入れ待ち
   - `useSourcingStats()` - 仕入れ統計

5. サイドバー更新
   - 仕入れ管理リンク追加（ShoppingBagアイコン）

---

### Phase 53-54: 発送管理UI & フロントエンド強化

**ステータス**: 完了 ✅

#### 実装内容

**Phase 53-54: 発送管理UI**
1. 発送管理ページ (`apps/web/src/app/shipments/page.tsx`)
   - 未発送注文一覧（緊急・通常フィルター）
   - 発送処理フォーム（配送業者選択、追跡番号入力）
   - 発送統計ダッシュボード（未発送、緊急、本日発送、累計）
   - マーケットプレイス別フィルター（Joom/eBay）
   - 発送期限表示（残り時間、緊急アラート）
   - 検索機能（注文ID、購入者、商品名）

2. APIクライアント更新 (`apps/web/src/lib/api.ts`)
   - `getPendingShipments()` - 未発送注文取得
   - `getShipmentStats()` - 発送統計取得
   - `getCarriers()` - 配送業者一覧取得

3. SWRフック追加 (`apps/web/src/lib/hooks.ts`)
   - `usePendingShipments()` - 未発送注文
   - `useShipmentStats()` - 発送統計
   - `useCarriers()` - 配送業者一覧

4. サイドバー更新 (`apps/web/src/components/layout/sidebar.tsx`)
   - 発送管理リンク追加（PackageCheckアイコン）

---

### Phase 51-52: 注文処理 & 発送処理自動化

**ステータス**: 完了 ✅

#### 実装内容

**Phase 51: 注文処理強化**
1. order-processor.ts (`apps/worker/src/lib/order-processor.ts`)
   - `processOrder()` - 注文の自動処理
   - `updateInventory()` - 在庫更新（商品ステータスをSOLDに）
   - `checkSourcingAvailability()` - 仕入れ元確認通知
   - `setShipmentDeadline()` - 発送期限設定
   - `notifyNewOrder()` - Slack通知
   - `sendDeadlineAlerts()` - 発送期限アラート
   - `updateSourcingStatus()` - 仕入れステータス更新

2. キュー追加 (`packages/config/src/constants.ts`)
   - ORDER: 'order-queue' - 注文処理キュー
   - SHIPMENT: 'shipment-queue' - 発送処理キュー

3. 注文処理プロセッサ (`apps/worker/src/processors/order.ts`)
   - BullMQジョブとして注文処理を実行

4. webhooks.ts更新 (`apps/api/src/routes/webhooks.ts`)
   - Joom/eBay注文受信時にジョブキューに追加

**Phase 52: 発送処理自動化**
1. shipment-service.ts (`apps/worker/src/lib/shipment-service.ts`)
   - `processShipment()` - 発送処理実行
   - `processBatchShipment()` - 一括発送処理
   - `getPendingShipments()` - 未発送注文一覧
   - `extendShipmentDeadline()` - 発送期限延長
   - `getAvailableCarriers()` - 配送業者一覧
   - Joom/eBay API連携（追跡番号登録）

2. 発送処理プロセッサ (`apps/worker/src/processors/shipment.ts`)
   - BullMQジョブとして発送処理を実行

3. APIエンドポイント (`apps/api/src/routes/shipments.ts`)
   - POST /api/shipments - 発送処理
   - POST /api/shipments/batch - 一括発送処理
   - GET /api/shipments/pending - 未発送注文一覧
   - GET /api/shipments/carriers - 配送業者一覧
   - POST /api/shipments/:orderId/extend-deadline - 発送期限延長
   - GET /api/shipments/stats - 発送統計

4. スケジューラー更新 (`apps/worker/src/lib/scheduler.ts`)
   - 発送期限チェック（6時間ごと）

## ファイル変更一覧

### Phase 55-56
#### 新規作成
- `apps/api/src/routes/sourcing.ts` - 仕入れ管理API
- `apps/web/src/app/sourcing/page.tsx` - 仕入れ管理ページ

#### 更新
- `apps/api/src/index.ts` - sourcingルート登録
- `apps/web/src/lib/api.ts` - 仕入れ関連API追加
- `apps/web/src/lib/hooks.ts` - 仕入れ関連SWRフック追加
- `apps/web/src/components/layout/sidebar.tsx` - 仕入れ管理リンク追加

### Phase 53-54
#### 新規作成
- `apps/web/src/app/shipments/page.tsx` - 発送管理ページ

#### 更新
- `apps/web/src/lib/api.ts` - 発送関連API追加
- `apps/web/src/lib/hooks.ts` - 発送関連SWRフック追加
- `apps/web/src/components/layout/sidebar.tsx` - 発送管理リンク追加

### Phase 51-52
#### 新規作成
- `apps/worker/src/lib/order-processor.ts`
- `apps/worker/src/lib/shipment-service.ts`
- `apps/worker/src/processors/order.ts`
- `apps/worker/src/processors/shipment.ts`
- `apps/api/src/routes/shipments.ts`

#### 更新
- `packages/config/src/constants.ts` - ORDER/SHIPMENTキュー追加
- `apps/worker/src/lib/worker-manager.ts` - 注文/発送ワーカー追加
- `apps/worker/src/lib/scheduler.ts` - 発送期限チェック追加
- `apps/api/src/routes/webhooks.ts` - ジョブキュー連携
- `apps/api/src/index.ts` - shipmentsルート登録

## 過去のPhase

### Phase 49-50: Joomカテゴリマッピング & S3直接アップロード
- JoomCategoryMappingモデル
- GPT-4oカテゴリ自動推定
- S3プリサインURLアップロード

### Phase 47-48: E2Eテスト & 画像処理最適化
- Playwright E2Eテスト
- 並列画像処理

### Phase 45-46: Joom APIログ強化 & リアルタイム監視
- APIログDB記録
- SSEキュー監視

### Phase 43-44: ジョブリカバリー & Slackアラート
- FailedJob/IdempotencyKeyモデル
- Slackアラート

### Phase 41-42: BullMQワーカー統合 & フロントエンドUI
- 共有キューパッケージ
- エンリッチメント管理ページ

## 次のPhaseへの推奨事項

### Phase 57-58候補

1. **価格最適化AI**
   - 競合分析エンジン
   - 動的価格調整ロジック
   - 需要予測モデル

2. **パフォーマンス最適化**
   - Redis キャッシュ戦略
   - データベースインデックス最適化
   - CDN設定

3. **ダッシュボード統合**
   - メインダッシュボードの実データ連携
   - リアルタイムKPI表示
   - グラフ・チャートの強化

## 技術的注意事項

1. **注文処理**
   - 注文受信時にORDERキューにジョブ追加
   - 在庫はProductのstatusをSOLDに更新
   - 仕入れ確認通知はNotificationとして作成

2. **発送処理**
   - 追跡番号登録時にJoom/eBay APIに自動連携
   - 発送期限は営業日計算（土日除外）
   - 期限24時間前に緊急アラート

3. **Slack通知**
   - alertManager.sendCustomAlert()を使用
   - 新規注文、発送完了、期限アラートを通知

## 環境変数

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/xxx/xxx
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=rakuda-images
JOOM_WEBHOOK_SECRET=xxx
```

## 動作確認

```bash
# ビルド
npm run build

# 開発サーバー起動
npm run dev

# Prisma生成
npx prisma generate --schema=packages/database/prisma/schema.prisma
```

## 関連ドキュメント

- `docs/PHASE40_JOOM_WORKFLOW_DESIGN.md`
- `docs/PHASE40_IMPLEMENTATION_GUIDE.md`

# Phase 28 実装指示書

## 概要
ハイブリッド型収益最大化エンジン（Hybrid Profit Maximizer）を実装する。

## 実装順序

### Phase 28A: データ基盤構築
1. `packages/database/prisma/schema.prisma` にモデル追加
   - PriceHistory（価格履歴）
   - CompetitorPriceLog（競合価格ログ）
   - PriceRecommendation（価格推奨）
   - PricingRule（価格ルール）
2. マイグレーション実行
3. `apps/worker/src/lib/pricing/price-history.ts` 作成

### Phase 28B: ルールエンジン実装
1. `apps/worker/src/lib/pricing/rule-engine.ts` 作成
2. `apps/worker/src/lib/pricing/rule-templates.ts` 作成
3. ルール評価ロジック実装

### Phase 28C: 安全装置実装
1. `apps/worker/src/lib/pricing/circuit-breaker.ts` 作成
2. `apps/worker/src/lib/pricing/throttling.ts` 作成
3. `apps/worker/src/lib/pricing/approval-workflow.ts` 作成

### Phase 28D: シミュレーション実装
1. `apps/worker/src/lib/pricing/simulator.ts` 作成
2. バックテスト機能
3. 影響試算ロジック

### Phase 28E: API・UI実装
1. `apps/api/src/routes/pricing-optimizer.ts` 作成
2. フロントエンドUI（推奨ダッシュボード、ルールビルダー）
3. Phase 27リアルタイム連携

## 注意事項
- 安全性を最優先（サーキットブレーカー必須）
- 自動適用は段階的に（最初は手動承認のみ）
- ルールの説明性を担保（推奨根拠を必ず表示）

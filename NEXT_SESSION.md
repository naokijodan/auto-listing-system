# 次回セッション: Phase 116

## 完了済み
- Phase 105-A〜C: テンプレート、一括操作、自動再出品
- Phase 106: eBay在庫監視強化
- Phase 107: eBay売上レポート
- Phase 108: eBayメッセージ管理
- Phase 109: eBay注文管理強化
- Phase 110: eBay返品・返金管理
- Phase 111: eBayフィードバック管理
- Phase 112: eBay分析・レポート強化
- Phase 113: eBayバルクエディター
- Phase 114: eBay競合分析
- Phase 115: eBay自動価格調整

### Phase 115 実装内容
1. **自動価格調整API** (`apps/api/src/routes/ebay-auto-pricing.ts`)
   - `GET /dashboard` - ダッシュボード
   - `GET /rules`, `POST /rules`, etc - ルールCRUD
   - `POST /execute` - 価格調整実行（ドライラン対応）
   - `GET /history` - 変更履歴
   - `GET/POST /settings` - 自動調整設定

2. **自動価格調整UI** (`apps/web/src/app/ebay/auto-pricing/page.tsx`)
   - ダッシュボード（変更統計）
   - ルール管理（作成、有効/無効、実行）
   - 履歴タブ
   - 設定（スケジュール、最大調整数）

### ルールタイプ
- `COMPETITOR_FOLLOW`: 競合追従
- `MIN_MARGIN`: 最低マージン
- `MAX_DISCOUNT`: 最大値下げ
- `DEMAND_BASED`: 需要ベース
- `TIME_BASED`: 時間ベース

## 次のステップ候補
- Phase 116: eBayスケジュール出品
- Phase 117: eBay在庫自動補充
- Phase 118: eBay出品最適化（タイトル/説明自動改善）

## 参考ファイル
- Prismaスキーマ: `packages/database/prisma/schema.prisma`
- 引き継ぎ書: `docs/HANDOVER_2026-02-14.md`

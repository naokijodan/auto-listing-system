# Joom API v3 クライアント完全書き直し設計書

## 作成日: 2026-03-09
## 決定方法: 3者協議（Claude + GPT-5 + Gemini）

---

## 背景

- 現在のjoom-api.ts（903行）は72エンドポイント中18しか実装していない（25%）
- snake_case/camelCase不整合、必須フィールド欠落、価格バグが頻発
- パッチ当てを繰り返したが失敗し続けた
- ユーザーがJoom API v3の全72エンドポイント仕様を完全に転記（joom-api-v3-spec.txt, 2422行）
- この仕様書をSingle Source of Truthとして、ゼロから書き直す

## 仕様書

**~/Desktop/joom-api-v3-spec.txt**（2422行、72エンドポイント）

| セクション | エンドポイント数 | 行範囲 |
|-----------|-----------------|--------|
| Products | 19 | 5-829 |
| Orders | 10 | 831-1159 |
| Shipping Destinations | 6 | 1160-1421 |
| Warehouses | 6 | 1423-1607 |
| Pickup Addresses | 5 | 1609-1775 |
| Pickup Requests | 6 | 1777-1932 |
| FBJ Stocking | 12 | 1934-2222 |
| Documents | 5 | 2223-2339 |
| Sandbox | 3 | 2341-2422 |

## ディレクトリ構造

```
apps/worker/src/lib/joom/
├── base-client.ts              # 認証・レート制限・リトライ・エラー正規化
├── shared-types.ts             # 共通型（Money, Image, Paging, ApiResponse等）
├── products/
│   ├── types.ts                # Product, Variant, Category, JoomSelect型
│   ├── client.ts               # 19エンドポイント
│   └── index.ts
├── orders/
│   ├── types.ts                # Order, ShippingAddress, PriceInfo型
│   ├── client.ts               # 10エンドポイント
│   └── index.ts
├── shipping-destinations/
│   ├── types.ts
│   ├── client.ts               # 6エンドポイント
│   └── index.ts
├── warehouses/
│   ├── types.ts
│   ├── client.ts               # 6エンドポイント
│   └── index.ts
├── pickup-addresses/
│   ├── types.ts
│   ├── client.ts               # 5エンドポイント
│   └── index.ts
├── pickup-requests/
│   ├── types.ts
│   ├── client.ts               # 6エンドポイント
│   └── index.ts
├── fbj/
│   ├── types.ts
│   ├── client.ts               # 12エンドポイント
│   └── index.ts
├── documents/
│   ├── types.ts
│   ├── client.ts               # 5エンドポイント
│   └── index.ts
├── sandbox/
│   ├── types.ts
│   ├── client.ts               # 3エンドポイント
│   └── index.ts
└── index.ts                    # 統合JoomClient + 全export
```

## 実装Phase

| Phase | 内容 | 成果物 |
|-------|------|--------|
| **Phase 1** | base-client.ts + shared-types.ts + products/* | 商品CRUD+カテゴリ管理が仕様通りに動く |
| **Phase 2** | joom-publish-service.ts書き直し | 出品パイプラインが新clientで動く |
| **Phase 3** | ワーカー移行（Strangler Fig） | 旧joom-api.tsへの依存を全て除去 |
| **Phase 4** | orders/* + shipping-destinations/* + warehouses/* | 注文処理・配送管理完成 |
| **Phase 5** | pickup-*/* + fbj/* + documents/* + sandbox/* | 全72エンドポイント完了 |
| **Phase 6** | 旧ファイル削除 + 統合テスト | クリーンアップ完了 |

## 設計原則

1. **仕様書が正（SSOT）**: joom-api-v3-spec.txtの記載通りに型とメソッドを定義。推測しない
2. **camelCase厳守**: v3仕様はcamelCase。変換層は不要
3. **Moneyは文字列**: 価格は全て`string`型（"4.52"形式）。numberへの変換禁止
4. **BaseClientは薄く**: 認証・HTTP・リトライのみ。ビジネスロジックを入れない
5. **各ドメインclientは仕様に忠実なI/O**: 引数と戻り値は仕様書と1:1対応
6. **publish-serviceはビジネスフロー**: 画像処理→商品作成→価格設定等のオーケストレーション

## base-client.ts の設計

### 責務
- OAuth2トークンの取得・キャッシュ・リフレッシュ
- HTTPリクエストの発行
- レート制限（bottleneck or p-limit相当）
- リトライ（指数バックオフ+ジッター、429/502のみ）
- エラーの正規化（JoomApiError型に統一）
- APIコールのログ記録（JoomApiLog Prismaモデルへ）

### やらないこと
- ビジネスロジック（価格計算、画像処理等）
- フィールドの変換やデフォルト値の埋め込み
- 特定ドメインの知識

## 互換性戦略: Strangler Figパターン

Facadeで旧インターフェースを維持するのではなく、各ワーカープロセッサーを1つずつ新クライアントに移行する。

### 移行対象（6ファイル）
1. apps/worker/src/processors/joom-publish.ts
2. apps/worker/src/processors/inventory.ts
3. apps/worker/src/processors/publish.ts
4. apps/worker/src/processors/order-sync.ts
5. apps/worker/src/processors/price-sync.ts
6. apps/worker/src/processors/inventory-sync.ts
7. apps/worker/src/lib/inventory-manager.ts

### 移行対象（APIルート 2ファイル）
1. apps/api/src/routes/joom.ts（813行、24エンドポイント）
2. apps/api/src/routes/joom-categories.ts（389行、10エンドポイント）

### 移行手順
1. 新clientを実装（Phase 1）
2. 各プロセッサー/ルートのimportを新clientに変更（Phase 3）
3. 全て移行完了後、旧joom-api.tsを削除（Phase 6）

## 価格バグ対策

### 原因
- `number`型で金額を扱い、浮動小数点誤差が発生
- 通貨換算ロジックの不備

### 対策
- shared-types.tsに`Money`型を定義（string形式 "4.52"）
- 全ドメインclientで金額はMoney型を使用
- 計算が必要な場合はpublish-service層でのみ行い、Decimal.jsを使用

## テスト戦略

1. **型テスト**: 各ドメインの型がv3仕様と一致するかの確認
2. **ユニットテスト**: 各エンドポイントメソッドのモックテスト
3. **Sandbox統合テスト**: Sandbox API（#70-72）を使った本番前テスト
4. **スナップショットテスト**: 仕様書のcurl例を「期待値」として検証

## 3者協議の記録

### Claude（オーケストレーター）
- ドメイン別ファイル分割を提案
- Phase分け（4段階）を提案
- index.tsでFacade互換を提案 → Geminiの反証を受けてStrangler Figに変更

### GPT-5
- 型分割（domain別）に賛成
- snake_case↔camelCase変換の一元化を提案
- 互換アダプタは薄く・局所的にすべきと指摘
- レート制限にトークンバケット方式を推奨

### Gemini
- types.ts 1ファイルは3000行超になると警告 → ドメイン別分割に賛成
- Strangler Figパターンを提案 → 採用
- Money型バリューオブジェクトの導入を提案 → 採用
- Facadeは「旧コードの延命装置」になると警告 → 重要な指摘

## 既存の未コミット変更

- apps/worker/src/lib/joom-publish-service.ts (+47行): 画像フォールバック改善
- apps/api/src/test/setup.ts (+235行): モック定義補完
- codex/current-task.txt (+123行): タスク定義

これらはPhase 2でpublish-service書き直し時に置き換えられる。

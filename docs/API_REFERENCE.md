# RAKUDA API リファレンス

## 概要

RAKUDA APIは、越境EC自動化システムのバックエンドAPIです。

- **ベースURL**: `http://localhost:3000/api`
- **認証**: APIキー認証（`X-API-Key` ヘッダー）
- **形式**: JSON

## 認証

すべてのAPIリクエストには認証が必要です（ヘルスチェック除く）。

```bash
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:3000/api/products
```

---

## エンドポイント一覧

### 商品管理 `/api/products`

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /products | 商品一覧取得 |
| GET | /products/:id | 商品詳細取得 |
| POST | /products | 商品作成 |
| PUT | /products/:id | 商品更新 |
| DELETE | /products/:id | 商品削除 |

### 出品管理 `/api/listings`

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /listings | 出品一覧取得 |
| GET | /listings/:id | 出品詳細取得 |
| POST | /listings | 出品作成 |
| PUT | /listings/:id | 出品更新 |
| DELETE | /listings/:id | 出品削除 |

### 注文管理 `/api/orders`

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /orders | 注文一覧取得 |
| GET | /orders/:id | 注文詳細取得 |
| POST | /orders | 注文作成 |
| PUT | /orders/:id | 注文更新 |

### 自動アクションルール `/api/automation-rules`

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /automation-rules/stats | 自動化統計 |
| GET | /automation-rules | ルール一覧 |
| POST | /automation-rules | ルール作成 |
| GET | /automation-rules/:id | ルール詳細 |
| PUT | /automation-rules/:id | ルール更新 |
| DELETE | /automation-rules/:id | ルール削除 |
| PATCH | /automation-rules/:id/toggle | 有効/無効切り替え |
| POST | /automation-rules/:id/test | テスト実行（ドライラン） |
| POST | /automation-rules/:id/execute | ルール実行 |
| GET | /automation-rules/executions | 実行履歴 |
| GET | /automation-rules/safety-settings | 安全設定取得 |
| PUT | /automation-rules/safety-settings | 安全設定更新 |
| POST | /automation-rules/emergency-stop | 緊急停止 |

#### ルール作成リクエスト例

```json
{
  "name": "低パフォーマンス自動停止",
  "description": "30日間閲覧数0の出品を自動停止",
  "triggerType": "low_performance",
  "conditions": {
    "metric": "views",
    "threshold": 0,
    "days": 30
  },
  "actions": [
    {
      "type": "pause_listing"
    }
  ],
  "isActive": true,
  "priority": 1
}
```

#### トリガータイプ

| タイプ | 説明 |
|--------|------|
| low_performance | 低パフォーマンス検出時 |
| price_change | 価格変動時 |
| inventory_low | 在庫低下時 |
| competitor_change | 競合変動時 |
| schedule | スケジュール実行 |

#### アクションタイプ

| タイプ | 説明 |
|--------|------|
| pause_listing | 出品停止 |
| adjust_price | 価格調整 |
| send_notification | 通知送信 |
| create_task | タスク作成 |

### 利益計算 `/api/profit-calculation`

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /profit-calculation/stats | 利益統計 |
| GET | /profit-calculation/listings | 出品別利益一覧 |
| POST | /profit-calculation/calculate | 利益計算（単品） |
| POST | /profit-calculation/simulate | シミュレーション |
| GET | /profit-calculation/costs | コスト一覧 |
| POST | /profit-calculation/costs | コスト登録 |
| PUT | /profit-calculation/costs/:id | コスト更新 |
| DELETE | /profit-calculation/costs/:id | コスト削除 |
| GET | /profit-calculation/fees | 手数料設定取得 |
| PUT | /profit-calculation/fees | 手数料設定更新 |
| GET | /profit-calculation/targets | 利益目標取得 |
| PUT | /profit-calculation/targets | 利益目標更新 |
| GET | /profit-calculation/report | 利益レポート |

#### 利益計算リクエスト例

```json
{
  "listingId": "listing-123"
}
```

#### シミュレーションリクエスト例

```json
{
  "listingId": "listing-123",
  "newPrice": 120.00
}
```

または

```json
{
  "listingId": "listing-123",
  "priceChangePercent": 10
}
```

#### コスト登録リクエスト例

```json
{
  "productId": "product-123",
  "purchasePrice": 3000,
  "domesticShipping": 500,
  "internationalShipping": 1500,
  "currency": "JPY"
}
```

### 出品パフォーマンス `/api/listing-performance`

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /listing-performance/stats | パフォーマンス統計 |
| GET | /listing-performance/listings | 出品一覧（スコア付き） |
| GET | /listing-performance/low-performers | 低パフォーマンス出品 |
| POST | /listing-performance/sync | eBay同期 |
| GET | /listing-performance/thresholds | 閾値設定 |
| PUT | /listing-performance/thresholds | 閾値更新 |
| GET | /listing-performance/trends | トレンド分析 |
| GET | /listing-performance/benchmarks | カテゴリベンチマーク |

### 改善提案 `/api/listing-improvement`

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /listing-improvement/stats | 提案統計 |
| POST | /listing-improvement/generate | AI改善提案生成 |
| GET | /listing-improvement/suggestions | 提案一覧 |
| POST | /listing-improvement/apply/:id | 提案適用 |
| POST | /listing-improvement/bulk-action | 一括アクション |
| GET | /listing-improvement/history | アクション履歴 |
| GET | /listing-improvement/effectiveness | 効果測定 |

### バックアップ・リカバリ `/api/backup-recovery`

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /backup-recovery/stats | バックアップ統計 |
| GET | /backup-recovery/jobs | ジョブ一覧 |
| POST | /backup-recovery/jobs | バックアップ開始 |
| GET | /backup-recovery/schedules | スケジュール一覧 |
| POST | /backup-recovery/schedules | スケジュール作成 |
| GET | /backup-recovery/recovery-points | リカバリポイント一覧 |
| POST | /backup-recovery/restore | リストア開始 |
| POST | /backup-recovery/verify/:id | 整合性検証 |

### 監視アラート `/api/monitoring-alerts`

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /monitoring-alerts/stats | アラート統計 |
| GET | /monitoring-alerts/rules | ルール一覧 |
| POST | /monitoring-alerts/rules | ルール作成 |
| GET | /monitoring-alerts/incidents | インシデント一覧 |
| PATCH | /monitoring-alerts/incidents/:id/acknowledge | 確認 |
| PATCH | /monitoring-alerts/incidents/:id/resolve | 解決 |
| GET | /monitoring-alerts/escalations | エスカレーション設定 |
| POST | /monitoring-alerts/test | テストアラート |

---

## 共通レスポンス形式

### 成功レスポンス

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### エラーレスポンス

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "code": "ERROR_CODE"
}
```

---

## ステータスコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | リクエストエラー |
| 401 | 認証エラー |
| 403 | 権限エラー |
| 404 | リソース未検出 |
| 500 | サーバーエラー |

---

## Swagger UI

API仕様の詳細は Swagger UI で確認できます:

```
http://localhost:3000/api/docs
```

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-02-13 | Phase 97-98 API追加（自動アクション・利益計算） |
| 2026-02-13 | Phase 95-96 API追加（パフォーマンス・改善提案） |
| 2026-02-13 | Phase 93-94 API追加（バックアップ・監視） |

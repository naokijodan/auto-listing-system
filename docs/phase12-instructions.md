# Phase 12 指示書

## 目的
テスト基盤構築 + eBay Sandbox連携

## 実行手順

### Step 1: 依存関係インストール
```bash
cd ~/Desktop/rakuda
npm install -D vitest @vitest/coverage-v8 @vitest/ui msw supertest @playwright/test
```

### Step 2: 設定ファイル作成
- `vitest.config.ts` をルートと各appに作成
- `apps/*/src/test/` ディレクトリ構造作成
- `.env.test` 作成

### Step 3: MSWセットアップ
- `apps/worker/src/test/mocks/handlers.ts` 作成
- `apps/worker/src/test/setup.ts` 作成

### Step 4: 単体テスト作成（優先順）
1. `price-calculator.test.ts` - 価格計算
2. `rate-limiter.test.ts` - レート制限
3. `inventory-checker.test.ts` - 在庫チェック
4. `scrapers/*.test.ts` - スクレイパー

### Step 5: 統合テスト（eBay Sandbox）
1. `ebay-auth.test.ts` - 認証フロー
2. `ebay-inventory.test.ts` - 在庫API

### Step 6: CI更新
- `.github/workflows/ci.yml` にテストスクリプト追加

### Step 7: コミット & プッシュ
```bash
git add .
git commit -m "feat: Phase 12 - Test infrastructure & Sandbox integration"
git push origin main
```

## 完了条件
- [ ] カバレッジ 80%+
- [ ] CI通過
- [ ] eBay Sandbox認証成功

## 詳細
`docs/phase12-plan.md` を参照

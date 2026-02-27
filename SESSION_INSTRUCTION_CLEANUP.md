# RAKUDA 方針転換指示書

## 背景

eBay Phase生成（Phase 114〜25290）で21,635個のスタブファイルが生成された。これらは全て同一テンプレートのコピーで、`res.json({ section: 'dashboard', action: 'summary' })` を返すだけのダミー。実際のeBay APIとの連携はない。

一方、コア実装は動作する状態にある:
- eBay APIクライアント (954行) + 出品サービス (425行) → OAuth済・動作可能
- Joom APIクライアント (811行) + 出品サービス (808行) → OAuth済・動作可能
- Etsy APIクライアント (268行) + 出品サービス (298行) → 認証待ち
- Shopify APIクライアント (197行) + 出品サービス (404行) → 認証待ち
- Depop APIクライアント (180行) + 出品サービス (335行) → 認証待ち
- テスト1,568件パス、0件失敗
- TSエラーは実質4件のみ（Depopの型ミスマッチ）

## 方針: eBay Phase生成を即時停止し、実用化に注力

**eBay Phaseの追加生成は一切行わない。**

---

## タスク一覧（優先順）

### Phase 1: クリーンアップ（1セッション）

1. **Depop TSエラー4件修正**
   - ファイル: `apps/worker/src/lib/depop-publish-service.ts`
   - Line 84: DownloadResult → string 型変換
   - Line 92: OptimizationResult → string 型変換
   - Line 93: UploadResult → string 型変換
   - Line 179: EnrichmentTaskManager.translate メソッド修正

2. **スタブファイル削除の検討**
   - `apps/api/src/routes/` 内の自動生成スタブ（21,000+ファイル）
   - `apps/web/src/app/ebay/` 内の自動生成UIページ
   - `apps/api/src/routes/ebay-routes.ts` (50,000+行のimport/register)
   - 判断基準: コア実装ファイル（ebay-auth.ts, ebay-listings.ts, ebay-bulk.ts, ebay-orders.ts等）は残す。シリーズ名付きファイル（*-minotaur.ts, *-gorgon.ts等）は全削除
   - **削除前にユーザーに確認すること**

3. **ebay-routes.ts再構築**
   - スタブのimport/registerを全削除
   - コア実装ルートのみ登録

### Phase 2: eBay E2Eテスト（1セッション）

4. **eBay出品フローのE2Eテスト**
   - テスト商品1件でフルフロー確認
   - Chrome拡張 → 商品取り込み → 翻訳 → eBay出品 → 確認
   - Sandbox環境で実行

### Phase 3: 外部認証（ユーザー操作が必要）

5. **Etsy OAuth認証**
   - Etsy Developer Accountでアプリ作成
   - API Key取得 → OAuth PKCE フロー実行 → トークン取得
   - テスト出品1件実行

6. **Shopify OAuth認証**
   - Shopify Partnerアカウントでアプリ作成
   - OAuth フロー実行 → トークン取得
   - テスト出品1件実行
   - Instagram Shop / TikTok Shop チャネル設定

7. **Depop Partner API認証**
   - Partner Portal申請 → APIキー取得 → 設定ページで登録
   - テスト出品1件実行

### Phase 4: 統合テスト（1セッション）

8. **全チャネル在庫同期テスト**
   - 1商品を全チャネルに出品
   - 在庫変更が全チャネルに同期されることを確認
   - 注文受付 → 在庫減少 → 他チャネル反映

---

## 実行ルール

- 確認不要で自律的に進める
- eBay Phaseの追加生成は禁止
- generate_series.py は使用しない
- コード変更はCodex CLIに委託
- 各タスク完了後: git commit → push → Obsidianノート

## 完了条件

- [ ] TSエラー0件
- [ ] テスト全件パス
- [ ] eBay出品E2Eテスト成功
- [ ] Etsy/Shopify/Depop認証完了（ユーザー操作後）
- [ ] 全チャネル統合テスト成功
- [ ] スタブファイル整理完了

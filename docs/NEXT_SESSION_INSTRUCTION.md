# 次セッション指示文

以下をそのままペーストして実行してください。

---

## 起動コマンド

```bash
cd ~/Desktop/rakuda
claude --dangerously-skip-permissions
```

---

## 指示文（コピー用）

```
RAKUDAプロジェクトの継続開発を行う。

## 前提条件
- 引き継ぎ書: docs/HANDOVER_20260210_FINAL.md
- eBay設計書: docs/PHASE45_EBAY_INTEGRATION_DESIGN.md
- 現在の状態: Joom 28件ACTIVE、高価格帯14件PAUSED（eBay用）

## 実行ルール【最重要】
1. 確認を一切するな
2. 判断は全て自分でしろ
3. 完了まで止まるな
4. 中間報告は不要、最終結果のみ報告
5. 複数タスクは並列エージェントで実行

## 今回のタスク

### Phase 45C: eBay OAuth設定・出品テスト

1. eBay認証設定
   - apps/api/src/routes/oauth.ts を確認
   - eBay OAuth認証フローが動作するか確認
   - 必要なら認証エンドポイントを実装

2. 高価格帯商品のeBay出品テスト
   - PAUSED状態の14件を対象
   - publishToEbay() を使用して出品
   - 結果を確認（ACTIVE/ERROR）

3. エラー対応
   - eBay APIエラーがあれば原因を特定
   - 必要な修正を実施

4. 完了時
   - Git commit & push
   - 引き継ぎ書更新
   - Obsidianノート作成

## 成果物
- eBay OAuth認証動作
- 高価格帯商品のeBay出品結果
- 更新された引き継ぎ書
```

---

## 補足情報

### eBay認証情報（.envに設定が必要）

```env
EBAY_CLIENT_ID=your_client_id
EBAY_CLIENT_SECRET=your_client_secret
EBAY_REDIRECT_URI=http://localhost:3000/oauth/ebay/callback
EBAY_ENVIRONMENT=sandbox  # or production
```

### 確認ポイント

1. eBay Developer Portalでアプリが作成されているか
2. OAuth Redirect URIが正しく設定されているか
3. Sandbox/Production環境の選択

### 既存のeBay関連コード

- `apps/worker/src/lib/ebay-api.ts` - API実装済み
- `apps/worker/src/processors/publish.ts` - publishToEbay()実装済み
- `packages/database/prisma/schema.prisma` - MarketplaceCredential対応済み

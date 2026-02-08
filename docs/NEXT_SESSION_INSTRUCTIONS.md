# RAKUDA 次セッション指示書

## 概要

このドキュメントは、RAKUDAプロジェクトの次セッションで実行すべき作業と、並列エージェント実行の指示を記載しています。

---

## 1. 作業開始前の確認

```bash
# プロジェクトディレクトリに移動
cd /Users/naokijodan/Desktop/rakuda

# Git状態確認
git status
git log --oneline -5

# 引き継ぎ書を確認
cat docs/HANDOVER_20260208.md
```

---

## 2. 並列エージェント実行指示

### 推奨構成: 3エージェント並列

次のセッションでは、以下の3つのエージェントを**同時に**起動して作業を分担してください。

```
ユーザー: 「3つのエージェントを並列で起動して、以下のタスクを実行してください」
```

### エージェント1: テスト担当（tdd-guide）
```
タスク: Phase 44-A 統合テスト追加

対象:
- apps/worker/src/processors/inventory-sync.ts
- apps/worker/src/processors/order-sync.ts
- apps/worker/src/processors/price-sync.ts
- apps/api/src/routes/marketplaces.ts

テスト項目:
1. Joom在庫同期の正常系・異常系テスト
2. eBay在庫同期の正常系・異常系テスト
3. 注文同期のステータスマッピングテスト
4. 価格同期の閾値判定テスト
5. 接続テストエンドポイントのテスト

出力先: apps/api/src/test/integration/marketplace-sync.test.ts
```

### エージェント2: バックエンド担当（general-purpose）
```
タスク: Phase 44-B 同期スケジュール動的設定

実装内容:
1. MarketplaceSyncSettingテーブルをPrismaスキーマに追加
2. 設定CRUD APIエンドポイント作成
  - GET /api/settings/sync-schedule
  - PUT /api/settings/sync-schedule
3. スケジューラーが設定を読み込むように改修
4. デフォルト設定のシード追加

対象ファイル:
- packages/database/prisma/schema.prisma
- apps/api/src/routes/settings.ts（新規）
- apps/worker/src/lib/scheduler.ts
```

### エージェント3: フロントエンド担当（general-purpose）
```
タスク: Phase 44-C 同期スケジュール設定UI

実装内容:
1. 設定ページに同期スケジュール編集セクション追加
2. Joom/eBay別の同期間隔設定フォーム
3. cron式のバリデーション
4. 設定保存・即時反映機能

対象ファイル:
- apps/web/src/app/settings/page.tsx
- apps/web/src/lib/hooks.ts
- apps/web/src/lib/api.ts
```

---

## 3. エージェント起動コマンド例

```
ユーザー指示例:

「3つのエージェントを並列で起動してください:

1. テスト担当: Phase 44-Aとして、marketplace-sync.test.tsを作成。inventory-sync.ts、order-sync.ts、price-sync.tsの統合テストを書いてください。

2. バックエンド担当: Phase 44-Bとして、同期スケジュールの動的設定機能を実装。Prismaスキーマ追加、settings.ts API作成、scheduler.ts改修。

3. フロントエンド担当: Phase 44-Cとして、設定ページに同期スケジュール編集UIを追加。Joom/eBay別の設定フォームを作成。

並列で進めて、完了したら各自コミットしてください。」
```

---

## 4. 各エージェントの完了条件

### エージェント1（テスト）
- [ ] テストファイル作成
- [ ] `npm run test:integration` パス
- [ ] カバレッジ80%以上
- [ ] コミット・プッシュ

### エージェント2（バックエンド）
- [ ] Prismaマイグレーション成功
- [ ] APIエンドポイント動作確認
- [ ] TypeScriptコンパイル成功
- [ ] コミット・プッシュ

### エージェント3（フロントエンド）
- [ ] UIコンポーネント実装
- [ ] TypeScriptコンパイル成功
- [ ] API連携動作確認
- [ ] コミット・プッシュ

---

## 5. コンフリクト回避ルール

並列作業時のコンフリクトを避けるため:

1. **担当ファイルを明確に分離**
   - テスト: `apps/*/test/` 配下のみ
   - バックエンド: `apps/api/`, `apps/worker/`, `packages/`
   - フロントエンド: `apps/web/`

2. **共通ファイルの変更は最後に統合**
   - `package.json`
   - `tsconfig.json`

3. **コミットメッセージにフェーズ番号を含める**
   ```
   feat: Phase 44-A 統合テスト追加
   feat: Phase 44-B 同期スケジュールAPI
   feat: Phase 44-C 同期スケジュールUI
   ```

---

## 6. 緊急時の対応

### ビルドエラー
```bash
npm run build
npx tsc --noEmit
```

### テスト失敗
```bash
npm run test:unit
npm run test:integration
```

### Prismaエラー
```bash
npx prisma generate --schema=packages/database/prisma/schema.prisma
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma
```

---

## 7. 完了後の報告

全エージェント完了後、以下を報告:

1. 各フェーズの実装サマリー
2. テストカバレッジ
3. コミットハッシュ一覧
4. 開発ログ作成（`/Users/naokijodan/開発ログ/rakuda_Phase44_*.md`）

---

## 8. 参考ドキュメント

- プロジェクトルール: `/Users/naokijodan/Desktop/rakuda/CLAUDE.md`
- グローバルルール: `/Users/naokijodan/.claude/CLAUDE.md`
- 引き継ぎ書: `/Users/naokijodan/Desktop/rakuda/docs/HANDOVER_20260208.md`
- Phase 40設計書: `/Users/naokijodan/Desktop/rakuda/docs/PHASE40_JOOM_WORKFLOW_DESIGN.md`

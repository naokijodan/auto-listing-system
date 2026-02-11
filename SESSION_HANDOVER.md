# RAKUDA セッション引継ぎ書

## 次のセッションへの指示

以下のコマンドでセッションを開始してください：

```
HANDOVER.mdとSESSION_HANDOVER.mdを読んで、RAKUDAプロジェクトの開発を継続して下さい。
確認不要で、同じルールで進めて下さい。
```

---

## プロジェクト概要

**RAKUDA** = 越境EC自動化システム
- 日本のECサイト（ヤフオク、メルカリ、Amazon JP）から商品をスクレイピング
- 海外マーケットプレイス（Joom、eBay）に自動出品
- AI翻訳・属性抽出・価格最適化

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Next.js 16, Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL (Prisma ORM) |
| Queue | BullMQ (Redis) |
| Storage | MinIO/S3 |
| AI | OpenAI GPT-4o |
| Testing | Vitest, Playwright |

## 現在の状態

### 完了済みPhase（累計 41-50）

| Phase | 内容 | 状態 |
|-------|------|------|
| 41-42 | BullMQワーカー統合 & フロントエンドUI | ✅ |
| 43-44 | ジョブリカバリー & Slackアラート | ✅ |
| 45-46 | Joom APIログ強化 & リアルタイム監視 | ✅ |
| 47-48 | E2Eテスト & 画像処理最適化 | ✅ |
| 49-50 | Joomカテゴリマッピング & S3直接アップロード | ✅ |

### 最新実装（Phase 49-50）

**Phase 49: Joomカテゴリマッピング**
- `JoomCategoryMapping`モデル（Prisma）
- GPT-4oカテゴリ自動推定
- `/api/joom-categories` エンドポイント
- 必須属性自動補完

**Phase 50: S3直接アップロード**
- プリサインURLアップロード機能
- `/api/uploads` エンドポイント
- バッチアップロード対応

---

## 運用ルール【必須遵守】

### 1. 自律実行モード
**確認を最小限にし、自律的に作業を進める**

#### 確認不要な操作
- ファイル読み書き・編集・削除
- npm install, build, dev, test
- git add, commit, push
- Prisma migrate, generate
- API呼び出し（OpenAI等）

#### 確認が必要な例外
- 破壊的操作（rm -rf, git reset --hard）
- 本番環境への影響
- 大量のAPI呼び出し（1000回超）

### 2. 3者協議プロトコル【自動実行】

設計判断が必要な場合、以下のキーワードで自動的に3者協議を実行：
- 「3者協議して」
- 「GPTとGeminiの意見も聞きたい」
- 「AIで議論して」
- 「多角的に検討して」

**使用ツール**: `mcp__ai-discussion__multi_discuss`

```javascript
// 実行例
mcp__ai-discussion__multi_discuss({
  topic: "Phase XX の実装方針",
  claude_opinion: "私の意見は...",
  rounds: 2
})
```

### 3. 作業完了時の必須タスク

1. **Gitコミット・プッシュ**
   ```bash
   git add <files>
   git commit -m "feat: Phase XX - 説明"
   git push
   ```

2. **HANDOVER.md更新**
   - 実装内容
   - ファイル変更
   - 次のPhase候補

3. **Obsidianノート作成**
   - パス: `/Users/naokijodan/開発ログ/rakuda_phaseXX_YYYYMMDD.md`
   - 内容: 実装詳細、Git情報、次への推奨

---

## 次のPhase候補

### Phase 51-52 推奨

1. **価格最適化AI**
   - 競合分析エンジン
   - 動的価格調整ロジック
   - 需要予測モデル

2. **注文自動処理**
   - Joom注文webhook受信
   - 在庫自動連携
   - 発送通知自動送信

3. **パフォーマンス最適化**
   - Redis キャッシュ戦略
   - データベースインデックス最適化
   - CDN設定

---

## 重要ファイルパス

| ファイル | 説明 |
|---------|------|
| `/HANDOVER.md` | 引継ぎ書（毎回更新） |
| `/CLAUDE.md` | プロジェクトルール |
| `~/.claude/CLAUDE.md` | グローバルルール |
| `/packages/database/prisma/schema.prisma` | DBスキーマ |
| `/apps/api/src/index.ts` | APIエントリポイント |
| `/apps/worker/src/lib/` | ワーカーサービス群 |

---

## 環境変数

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

---

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト
npm run test:unit
npm run test:e2e

# Prisma
npx prisma generate --schema=packages/database/prisma/schema.prisma
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma
```

---

## チェックリスト

新しいセッション開始時：
- [ ] HANDOVER.md を読む
- [ ] SESSION_HANDOVER.md を読む
- [ ] 最新のGit状態を確認（`git status`, `git log -3`）
- [ ] 3者協議ルールを理解
- [ ] 確認不要ルールを理解

Phase完了時：
- [ ] ビルド成功確認（`npm run build`）
- [ ] Gitコミット・プッシュ
- [ ] HANDOVER.md更新
- [ ] Obsidianノート作成

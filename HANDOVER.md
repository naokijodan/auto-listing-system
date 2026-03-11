# RAKUDA 引継ぎ書

## 最終更新: 2026-03-12 (Session 34)

---

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ ミッション【最重要】
**21ページを100%完成させる。** これ以外に優先するものはない。

■ 作業手順【絶対遵守・この順番で進めること】

### Step 1: 現状把握
1. HANDOVER.md を読む（このファイル）
2. `~/Desktop/rakuda/CLAUDE.md` を読む
3. サーバー負荷を確認:
   ```
   ssh root@45.32.28.61 "top -bn1 | head -4; docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' | sort -k2 -rn | head -8"
   ```
4. MinIOのCPU異常（50%超）→即再起動: `docker restart minio-qo4s4o04w0c8wckwk0soc44c`
5. git log で最新コミットを確認

### Step 2: Obsidianノート確認
1. `search_notes` で「rakuda」を検索し、直近の開発ログを読む
2. `~/Desktop/rakuda/docs/KNOWN_ISSUES.md` を確認
3. 過去の問題を把握してから作業開始

### Step 3: 3者協議で設計
1. 完成させるページを1つ選ぶ（下記の優先順に従う）
2. そのページの現在のコードを読む
3. 何が足りないか、何を実装すべきかを洗い出す
4. `mcp__ai-discussion__multi_discuss` で3者協議を実行
   - topic: 「{ページ名}を100%完成させるための設計」
   - claude_opinion: 洗い出した課題と実装方針
   - rounds: 2
5. 3者協議の結果をもとに設計書を作成
6. **設計書をユーザーに提示し、承認を得る**

### Step 4: ステップバイステップ実装
1. 設計書の承認後、1タスクずつ順番に実装
2. コード生成はCodex CLI（`/opt/homebrew/bin/codex`）に委託
3. 各タスク完了後にテスト実行で動作確認
4. 全タスク完了後にデプロイ

### Step 5: 次のページへ
1. 完成したページの実装度を100%に更新
2. このHANDOVER.mdを更新
3. Obsidianノートに記録
4. Step 3に戻り、次のページへ

■ ページ完成の優先順
| 優先 | パス | 内容 | 現在の実装度 |
|------|------|------|-------------|
| 1 | `/joom/categories` | Joomカテゴリ | 80% |
| 2 | `/joom` | Joom管理 | 95% |
| 3 | `/products/review` | 商品レビュー | 95% |
| 4 | `/products` | 商品管理 | 80% |
| 5 | `/listings` | 出品管理 | 85% |
| 6 | `/orders` | 注文管理 | 90% |
| 7 | `/` | ダッシュボード | 80% |
| 8 | `/notifications` | 通知 | 80% |
| 9 | `/enrichment` | エンリッチメント | 90% |
| 10 | `/marketplace` | マーケットプレイス | 90% |
| 11 | `/pricing-ai` | AI価格設定 | 90% |
| 12 | `/batch` | バッチ処理 | 95% |
| 13 | `/inventory` | 在庫管理 | 95% |
| 14 | `/jobs` | ジョブ監視 | 85% |
| 15 | `/integrations` | 外部連携 | 70% |
| 16 | `/settings` | 設定 | 60% |
| 17 | `/settings/categories` | カテゴリマッピング | 50% |
| 18 | `/settings/notifications` | 通知チャンネル | 50% |
| 19 | `/settings/prompts` | 翻訳プロンプト | 50% |
| 20 | `/settings/rate-limits` | レート制限 | 50% |
| 21 | `/settings/templates` | 出品テンプレート | 50% |

■ 現在のステータス
- commit: 8dca9065 (main)、push済み
- Web: https://rakuda.dev（デプロイ済み）
- API: https://api.rakuda.dev（running）
- Worker: running
- Joom出品: 13件 ACTIVE
- eBay出品: 0件
- Shopify: 1件 ACTIVE

■ 開発ワークフロー（必須）
- コード生成はCodex CLI（/opt/homebrew/bin/codex）に委託する
- Claudeはコードを直接書かない（設定ファイル・ドキュメント以外）
- 複数の独立タスクはCodex/Geminiを並列で立てる
- 設計判断はGemini（mcp__gemini-bridge）または3者協議で

■ Vultrサーバー負荷管理【絶対遵守】
- 2026-03-12にVultrからリソース制限ペナルティ（2回目）
- 制限解除条件: 2週間低負荷を維持してからVultrに返信
- MinIOのCPU異常（50%超）→即再起動
- coolify-redis/coolify-realtimeもCPU暴走時は再起動
- デプロイは必要最小限（ペナルティ下で30分/回）

■ Coolifyデプロイ情報
- `POST http://45.32.28.61:8000/api/v1/deploy?uuid={UUID}&force=true`
  - API: acg8g884ck4woc480cgcg8kk
  - Web: zoo8cgswg4ssc84kgcog8cg0
  - Worker: g0s4ws488008g88ww4s4kkog
- Coolify API Token: 14|85gWstw2p1iv6OtnQxwwP67NEWOqRV3xr1Uz0s4n7fafa115

■ 注意事項
- テスト出品は動作確認後に必ず取り下げること
- eBayに対するブラウザ操作は全面禁止
- 設計承認なしでコーディングを始めない
- 緊急対応（サーバー負荷等）は最小限で済ませ、ページ完成作業に戻る

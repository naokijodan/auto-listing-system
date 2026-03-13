# RAKUDA 引継ぎ書

## 最終更新: 2026-03-14 (Session 42)

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ ミッション
**21ページを100%完成させる。（8/21完了）**

■ 開始方法
`rakuda-dev` Skillを実行する（`~/Desktop/rakuda/.claude/skills/rakuda-dev/SKILL.md`）

■ 前回（Session 42）の結果
- `/marketplace` を100%完成（型外出し65行、Zodバリデーション、a11y 15箇所、テスト17件）
- CRITICAL: APIパス不一致修正（単数→複数、未実装エンドポイント→graceful degradation）
- 次の対象: `/pricing-ai`（90%→100%）

■ ページ優先順
| # | パス | 実装度 |
|---|------|--------|
| 1 | `/joom/categories` | ✅ 100% |
| 2 | `/joom` | ✅ 100% |
| 3 | `/products/review` | ✅ 100% |
| 4 | `/batch` | ✅ 100% |
| 5 | `/inventory` | ✅ 100% |
| 6 | `/orders` | ✅ 100% |
| 7 | `/enrichment` | ✅ 100% |
| 8 | `/marketplace` | ✅ 100% |
| 9 | `/pricing-ai` | 90% |
| 10 | `/listings` | 85% |
| 11 | `/jobs` | 85% |
| 12 | `/products` | 80% |
| 13 | `/` | 80% |
| 14 | `/notifications` | 80% |
| 15 | `/integrations` | 70% |
| 16 | `/settings` | 60% |
| 17 | `/settings/categories` | 50% |
| 18 | `/settings/notifications` | 50% |
| 19 | `/settings/prompts` | 50% |
| 20 | `/settings/rate-limits` | 50% |
| 21 | `/settings/templates` | 50% |

■ 現在のステータス
- commit: 402b46d5 (main)、push済み
- Web: https://rakuda.dev / API: https://api.rakuda.dev

■ 開発ワークフロー（必須）
- コード生成はCodex CLI（/opt/homebrew/bin/codex）に委託する
- 複数の独立タスクはCodex/Geminiを並列で立てる
- 設定ファイル・ドキュメントの編集のみ例外として直接可

■ Joom担当者確認事項（2026-03-12、ナスチャ a.titova@joom.com）
※ スケジュール確定済み（2026-03-14 3者協議）
1. **トップ画像白背景処理** — **スケジュール: /pricing-ai 完了直後に実装**。image-processor.tsにJoom向け白背景変換ステップを追加。既存フロー非影響
2. **ブランド名リスト送付** — **スケジュール: 実運用開始時**（開発フェーズでは不要）。DB brandsテーブルから英語表記で抽出しナスチャに送付
3. **モデレーション審査待ち** — 対応不要、結果を待つのみ
- 詳細: 開発ログ/rakuda_Joom担当者確認事項.md

■ 注意事項
- Vultrペナルティ中：デプロイは必要最小限
- /joomの残タスク: T7アクセシビリティ、T9 as any改善
- /products/reviewの残タスク: a11y（ARIA）、無限スクロール（将来的に必要時）

確認不要で自律実行してほしい。

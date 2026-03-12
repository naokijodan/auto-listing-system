# RAKUDA 引継ぎ書

## 最終更新: 2026-03-12 (Session 40)

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ ミッション
**21ページを100%完成させる。（6/21完了）**

■ 開始方法
`rakuda-dev` Skillを実行する（`~/Desktop/rakuda/.claude/skills/rakuda-dev/SKILL.md`）

■ 前回（Session 40）の結果
- `/orders` を100%完成（型外出し、Zodバリデーション、prompt→モーダル化、APIエンドポイント修正、a11y 13箇所、テスト33件）
- CRITICAL修正: PATCH /orders/:id → /orders/:id/status + /orders/:id/shipping に分離
- 次の対象: `/enrichment`（90%→100%）

■ ページ優先順
| # | パス | 実装度 |
|---|------|--------|
| 1 | `/joom/categories` | ✅ 100% |
| 2 | `/joom` | ✅ 100% |
| 3 | `/products/review` | ✅ 100% |
| 4 | `/batch` | ✅ 100% |
| 5 | `/inventory` | ✅ 100% |
| 6 | `/orders` | ✅ 100% |
| 7 | `/enrichment` | 90% |
| 8 | `/marketplace` | 90% |
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
- commit: 9f00136d (main)、push済み
- Web: https://rakuda.dev / API: https://api.rakuda.dev

■ 開発ワークフロー（必須）
- コード生成はCodex CLI（/opt/homebrew/bin/codex）に委託する
- 複数の独立タスクはCodex/Geminiを並列で立てる
- 設定ファイル・ドキュメントの編集のみ例外として直接可

■ Joom担当者確認事項（2026-03-12、ナスチャ a.titova@joom.com）
※ 21ページ完成ミッションとは独立。ページ完成の合間、またはミッション完了後に対応する。既存パイプラインは壊さない。
1. **トップ画像白背景処理** — Joom出品時、1枚目画像を白抜きにする処理を画像パイプラインに追加（image-processor.ts）。既存の画像処理フローに「Joom向け白背景変換」ステップを追加する形で、eBay等の既存フローには影響させない
2. **ブランド名リスト送付** — DB brandsテーブル（505ブランド）から販売予定ブランドを英語表記で抽出し、ナスチャに送付。Joom側でオーソライズしてくれる
3. **モデレーション審査待ち** — テスト出品の審査結果待ち。対応不要、結果を待つのみ
- 詳細: 開発ログ/rakuda_Joom担当者確認事項.md

■ 注意事項
- Vultrペナルティ中：デプロイは必要最小限
- /joomの残タスク: T7アクセシビリティ、T9 as any改善
- /products/reviewの残タスク: a11y（ARIA）、無限スクロール（将来的に必要時）

確認不要で自律実行してほしい。

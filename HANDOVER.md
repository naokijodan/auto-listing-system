# RAKUDA 引継ぎ書

## 最終更新: 2026-03-12 (Session 39)

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ ミッション
**21ページを100%完成させる。（5/21完了）**

■ 開始方法
`rakuda-dev` Skillを実行する（`~/Desktop/rakuda/.claude/skills/rakuda-dev/SKILL.md`）

■ 前回（Session 39）の結果
- `/inventory` を100%完成（型外出し、Zodバリデーション、toast化、レスポンシブ、a11y、テスト42件）
- 次の対象: `/orders`（90%→100%）

■ ページ優先順
| # | パス | 実装度 |
|---|------|--------|
| 1 | `/joom/categories` | ✅ 100% |
| 2 | `/joom` | ✅ 100% |
| 3 | `/products/review` | ✅ 100% |
| 4 | `/batch` | ✅ 100% |
| 5 | `/inventory` | ✅ 100% |
| 6 | `/orders` | 90% |
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
- commit: 618e3d2e (main)、push済み
- Web: https://rakuda.dev / API: https://api.rakuda.dev

■ 開発ワークフロー（必須）
- コード生成はCodex CLI（/opt/homebrew/bin/codex）に委託する
- 複数の独立タスクはCodex/Geminiを並列で立てる
- 設定ファイル・ドキュメントの編集のみ例外として直接可

■ 注意事項
- Vultrペナルティ中：デプロイは必要最小限
- /joomの残タスク: T7アクセシビリティ、T9 as any改善
- /products/reviewの残タスク: a11y（ARIA）、無限スクロール（将来的に必要時）

確認不要で自律実行してほしい。

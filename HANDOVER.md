# RAKUDA 引継ぎ書

## 最終更新: 2026-03-12 (Session 37)

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ ミッション
**21ページを100%完成させる。（2/21完了）**

■ 開始方法
`rakuda-dev` Skillを実行する（`~/Desktop/rakuda/.claude/skills/rakuda-dev/SKILL.md`）

■ 前回（Session 37）の結果
- `/joom` を100%完成（ファイル分割、Zodバリデーション、ページネーション、レスポンシブ、テスト23件、エラーレスポンス統一）
- 次の対象: `/products/review`（95%→100%）

■ ページ優先順
| # | パス | 実装度 |
|---|------|--------|
| 1 | `/joom/categories` | ✅ 100% |
| 2 | `/joom` | ✅ 100% |
| 3 | `/products/review` | 95% |
| 4 | `/products` | 80% |
| 5 | `/listings` | 85% |
| 6 | `/orders` | 90% |
| 7 | `/` | 80% |
| 8 | `/notifications` | 80% |
| 9 | `/enrichment` | 90% |
| 10 | `/marketplace` | 90% |
| 11 | `/pricing-ai` | 90% |
| 12 | `/batch` | 95% |
| 13 | `/inventory` | 95% |
| 14 | `/jobs` | 85% |
| 15 | `/integrations` | 70% |
| 16 | `/settings` | 60% |
| 17 | `/settings/categories` | 50% |
| 18 | `/settings/notifications` | 50% |
| 19 | `/settings/prompts` | 50% |
| 20 | `/settings/rate-limits` | 50% |
| 21 | `/settings/templates` | 50% |

■ 現在のステータス
- commit: acd8ee73 (main)、push済み
- Web: https://rakuda.dev / API: https://api.rakuda.dev

■ 開発ワークフロー（必須）
- コード生成はCodex CLI（/opt/homebrew/bin/codex）に委託する
- 複数の独立タスクはCodex/Geminiを並列で立てる
- 設定ファイル・ドキュメントの編集のみ例外として直接可

■ 注意事項
- Vultrペナルティ中：デプロイは必要最小限
- /joomの残タスク（次回）: T7アクセシビリティ、T9 as any改善

確認不要で自律実行してほしい。

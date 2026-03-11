# RAKUDA 引継ぎ書

## 最終更新: 2026-03-11 (Session 33: UI整理・Settings永続化)

---

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ 前回のセッション（Session 33）でやったこと
- **非機能ボタンの非表示**（commit a0416955）
  - /listings: 「価格一括変更」ボタンをコメントアウト
  - /products: 「一括編集」「価格一括変更」ボタンをコメントアウト
- **サイドバーナビゲーション整理**（commit a0416955）
  - メイン26→14項目、管理20→1項目（外部連携のみ）
  - eBay管理、レポート系、分析系、管理系をコメントアウト（コード保持）
- **価格設定の保存機能実装**（commit a0416955）
  - PriceSettingsにstate管理追加、SystemSetting API経由でDB永続化
  - キー: pricing.ebay.*, pricing.joom.*
- **マーケットプレイスルーティング設定の永続化**（commit a0416955）
  - 出品ルーティング設定セクションを保存機能付きで復活
  - キー: marketplace.route.*
- **Coolifyデプロイ済み**（web）

■ 次にやること
1. **Joom再出品** — UI整理が完了したので、Joomに商品を再出品する
   - 現在Joom出品: 0件（Session 32で全削除済み）
   - 商品レビュー → Joom出品のフローを確認・実行
2. **Settings保存の動作確認** — 本番UIで価格設定・ルーティング設定の保存が正常に動くか確認
3. **通知設定の閾値保存**（低優先）— 現在UIのみ、永続化なし

■ 現在のステータス
- commit: a0416955 (main)、push済み
- Web: デプロイ中（Coolifyキュー投入済み）
- API: running (api.rakuda.dev)
- Worker: running
- Joom出品: 0件（全削除済み・再出品予定）
- eBay出品: 0件
- Shopify: 1件 ACTIVE

■ UI監査結果（Session 33更新）
| ページ | 実装度 | 備考 |
|--------|--------|------|
| /joom | 95% | ほぼ完成 |
| /batch | 95% | SSEリアルタイム監視 |
| /inventory | 95% | ほぼ完成 |
| /products/review | 95% | キーボードショートカット |
| /pricing-ai | 90% | ほぼ完成 |
| /orders | 90% | 追跡入力UIがPrompt() |
| /marketplace | 90% | ルーティング永続化完了 |
| /listings | 85% | 非機能ボタン非表示済み |
| /products | 80% | 非機能ボタン非表示済み |
| /settings | 60% | 価格設定Save実装済み、通知閾値は未 |

■ 開発ワークフロー（必須）
- コード生成はCodex CLI（/opt/homebrew/bin/codex）に委託する
- 複数の独立タスクはCodex/Geminiを並列で立てる
- 設定ファイル・ドキュメントの編集のみ例外として直接可

■ 注意事項
- テスト出品は動作確認後に必ず取り下げること（放置するとアカウントリスク）
- eBayに対するブラウザ操作は全面禁止（永久サスペンドリスク）
- Etsyは放置（ユーザーから明確に指示済み）
- Coolifyデプロイ: `POST http://45.32.28.61:8000/api/v1/deploy?uuid={UUID}&force=true`
  - API: acg8g884ck4woc480cgcg8kk
  - Web: zoo8cgswg4ssc84kgcog8cg0
  - Worker: g0s4ws488008g88ww4s4kkog
- Coolify API Token: 14|85gWstw2p1iv6OtnQxwwP67NEWOqRV3xr1Uz0s4n7fafa115

確認不要で自律実行してほしい。

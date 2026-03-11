# RAKUDA 引継ぎ書

## 最終更新: 2026-03-12 (Session 33: UI大掃除完了)

---

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ 前回のセッション（Session 33）でやったこと
- **eBay配下681ページを全削除**（UIのみ・バックエンド未接続、142,138行削除）
- **UIのみの非eBayページ39個を全削除**（26,722行削除）
- **サイドバーを完全整理**（746ページ → 21ページ、サイドバー11項目+管理1項目）
- **非機能ボタンの非表示**（listings・productsの動かないボタン）
- **価格設定の保存機能実装**（SystemSetting API経由でDB永続化）
- **マーケットプレイスルーティング設定の永続化**
- **本番デプロイ完了**（ビルド時間46秒→10秒に短縮）

■ 現在残っている全21ページ
| パス | 内容 | 実装度 |
|------|------|--------|
| `/` | ダッシュボード | 80% |
| `/products` | 商品管理 | 80% |
| `/products/review` | 商品レビュー | 95% |
| `/enrichment` | エンリッチメント | 90% |
| `/batch` | バッチ処理 | 95% |
| `/joom` | Joom管理 | 95% |
| `/joom/categories` | Joomカテゴリ | 80% |
| `/listings` | 出品管理 | 85% |
| `/orders` | 注文管理 | 90% |
| `/inventory` | 在庫管理 | 95% |
| `/marketplace` | マーケットプレイス | 90% |
| `/pricing-ai` | AI価格設定 | 90% |
| `/jobs` | ジョブ監視 | 85% |
| `/notifications` | 通知 | 80% |
| `/integrations` | 外部連携 | 70% |
| `/settings` | 設定 | 60% |
| `/settings/categories` | カテゴリマッピング | 50% |
| `/settings/notifications` | 通知チャンネル | 50% |
| `/settings/prompts` | 翻訳プロンプト | 50% |
| `/settings/rate-limits` | レート制限 | 50% |
| `/settings/templates` | 出品テンプレート | 50% |

■ 次にやること【Joom最優先】

### 最優先: Joom完成 → 再出品
1. Joomページ（/joom）の残り5%を確認・完成
2. 商品レビュー → Joom出品フローの動作確認
3. Joomに商品を再出品（現在0件、Session 32で全削除済み）
4. 出品後の管理機能（enable/disable/削除）が正常動作するか確認

### その後: 各ページの100%完成
各ページを順に確認し、足りない機能を実装して完成させる。
優先順：Joom → 商品管理 → 出品管理 → 注文管理 → 設定 → その他

■ 現在のステータス
- commit: 190be6e8 (main)、push済み
- Web: デプロイ済み（https://rakuda.dev）
- API: running (api.rakuda.dev)
- Worker: running
- Joom出品: 0件（全削除済み・再出品待ち）
- eBay出品: 0件
- Shopify: 1件 ACTIVE

■ 開発ワークフロー（必須）
- コード生成はCodex CLI（/opt/homebrew/bin/codex）に委託する
- 複数の独立タスクはCodex/Geminiを並列で立てる
- 設定ファイル・ドキュメントの編集のみ例外として直接可

■ Vultrサーバー負荷管理【絶対遵守】
- 2026-03-12にVultrからリソース制限ペナルティ（2回目）
- 制限解除条件: 2週間低負荷を維持してからVultrに返信
- セッション開始時にサーバー負荷を必ず確認:
  ssh root@45.32.28.61 "top -bn1 | head -4; docker stats --no-stream"
- MinIOのCPU異常（50%超）→即再起動: docker restart minio-qo4s4o04w0c8wckwk0soc44c
- デプロイは必要最小限、短時間に連続デプロイしない
- coolify-sentinelは300秒間隔に変更済み（元は60秒）

■ 注意事項
- テスト出品は動作確認後に必ず取り下げること（放置するとアカウントリスク）
- eBayに対するブラウザ操作は全面禁止（永久サスペンドリスク）
- Coolifyデプロイ: `POST http://45.32.28.61:8000/api/v1/deploy?uuid={UUID}&force=true`
  - API: acg8g884ck4woc480cgcg8kk
  - Web: zoo8cgswg4ssc84kgcog8cg0
  - Worker: g0s4ws488008g88ww4s4kkog
- Coolify API Token: 14|85gWstw2p1iv6OtnQxwwP67NEWOqRV3xr1Uz0s4n7fafa115
- サーバーCPU steal time 66%のためデプロイに約15分かかる

確認不要で自律実行してほしい。

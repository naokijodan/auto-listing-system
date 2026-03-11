# RAKUDA 引継ぎ書

## 最終更新: 2026-03-12 (Session 34: Joom再出品完了)

---

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ 前回のセッション（Session 34）でやったこと
- **サーバー負荷緊急対応**: MinIO(94%→8%), Coolify(349%→27%), coolify-redis(95%→8%)を再起動
- **Joomバッチ出品のバグ修正**: EnrichmentTask PUBLISHEDステータスも受け入れるよう4箇所修正
- **Joom 13商品の再出品完了**: 全13商品ACTIVEステータスで出品成功
  - 時計2件: Longines $1,224.99, Seiko $859.12
  - ゲーム11件: $26.79 - $117.88
- **API + Worker デプロイ完了**（ペナルティ下でAPI 18分、Worker 30分）

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

■ 次にやること
1. Joom出品の管理機能確認（enable/disable/削除が正常動作するか）
2. 画像未処理の9商品の画像処理→出品
3. 各ページを順に100%完成
   - 優先順：商品管理 → 出品管理 → 注文管理 → 設定 → その他

■ 現在のステータス
- commit: b8ffeb9b (main)、push済み
- Web: デプロイ済み（https://rakuda.dev）
- API: running (api.rakuda.dev) - デプロイ済み
- Worker: running - デプロイ済み
- **Joom出品: 13件 ACTIVE**
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
- coolify-redis/coolify-realtimeもCPU暴走時は再起動
- デプロイは必要最小限、短時間に連続デプロイしない（ペナルティ下で30分/回）
- coolify-sentinelは300秒間隔に変更済み（元は60秒）

■ 注意事項
- テスト出品は動作確認後に必ず取り下げること（放置するとアカウントリスク）
- eBayに対するブラウザ操作は全面禁止（永久サスペンドリスク）
- Coolifyデプロイ: `POST http://45.32.28.61:8000/api/v1/deploy?uuid={UUID}&force=true`
  - API: acg8g884ck4woc480cgcg8kk
  - Web: zoo8cgswg4ssc84kgcog8cg0
  - Worker: g0s4ws488008g88ww4s4kkog
- Coolify API Token: 14|85gWstw2p1iv6OtnQxwwP67NEWOqRV3xr1Uz0s4n7fafa115
- サーバーCPU steal timeペナルティ中のためデプロイに約30分かかる

確認不要で自律実行してほしい。

# RAKUDA 引継ぎ書

## 最終更新: 2026-03-11 (Session 31: システム復旧・HTTP在庫監視移行・eBay出品)

---

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ 前回のセッション（Session 31）でやったこと
- **全システム復旧確認**（ディスク15%、API/Worker/SSH正常稼働）
- **Joom 13件をPAUSED→ACTIVEに復帰**、marketplaceListingIdをJoom product IDと紐づけ
- **Puppeteer→軽量HTTP在庫監視に移行**（commit cde16c86）
  - 5サイトのHTTPスクレイパー新規作成（Mercari, Yahoo, Amazon, PayPay, Rakuma）
  - inventory-checker.tsをHTTP-first方式に変更（USE_PUPPETEER_FALLBACK=trueでフォールバック可能）
- **スケジューラ頻度削減**（Coolify環境変数で設定）
  - INVENTORY_CHECK_TIMES_PER_DAY: 3→1、ACTIVE_INVENTORY_MONITOR_CRON: 毎時→6時間毎
- **Docker buildキャッシュ自動クリーンアップcron追加**（毎日2時実行）
- **eBay本番出品2件成功**
  - LONGINES Conquest: $1,058.32 → https://www.ebay.com/itm/137116175774
  - Seiko SBDC081: $741.23 → https://www.ebay.com/itm/137116175651
- **Joom注文確認**: 0件（出品から約1日経過）

■ 現在のステータス
- commit: cde16c86 (main)、push済み
- API: running (api.rakuda.dev) — DB: ok, Redis: ok
- Worker: running（新コードでデプロイ済み・HTTP在庫監視有効）
- ディスク: 15%使用
- CPU: 66% steal time（Vultr制限まだ有効）
- Joom出品: 13件 ACTIVE
- eBay出品: 2件 ACTIVE（新規）、2件 ENDED（旧）
- Shopify: 1件 ACTIVE
- Joomトークン有効期限: 2026-03-30
- eBayトークン: 自動リフレッシュ

■ 出品一覧
| マーケット | 件数 | ステータス | 商品 |
|---|---|---|---|
| Joom | 13件 | ACTIVE | 時計2 + ゲーム11 |
| eBay | 2件 | ACTIVE | LONGINES $1,058 / Seiko SBDC081 $741 |
| Shopify | 1件 | ACTIVE | セイコー プレサージュ SARX035 |
| eBay | 2件 | ENDED | 旧出品 |

■ 残タスク（優先順位順）
1. **Etsy OAuth認証実行**（ユーザー手動操作が必要）
2. **Joom/eBay売上モニタリング** — 売れる→発送→入金のサイクル完結
3. **計画書の実態更新**
   - https://naokijodan.github.io/auto-listing-system-plan/
   - https://naokijodan.github.io/resale-automation-design/
4. **Vultrチケット NPY-96HMK フォローアップ**（CPU制限解除依頼）
5. **追加商品の出品**（在庫拡充）

■ 開発ワークフロー（必須）
- コード生成はCodex CLI（/opt/homebrew/bin/codex）に委託する
- 複数の独立タスクはCodex/Geminiを並列で立てる
- 設定ファイル・ドキュメントの編集のみ例外として直接可

■ 注意事項
- テスト出品は動作確認後に必ず取り下げること（放置するとアカウントリスク）
- eBayに対するブラウザ操作は全面禁止（永久サスペンドリスク）
- Coolifyデプロイ確認: API uuid=acg8g884ck4woc480cgcg8kk / Worker uuid=g0s4ws488008g88ww4s4kkog
- Coolify API Token: 14|85gWstw2p1iv6OtnQxwwP67NEWOqRV3xr1Uz0s4n7fafa115
- Vultr rootパスワード: Rakuda2026（VNC用）
- Worker新コンテナ: g0s4ws488008g88ww4s4kkog-054643497720

■ 現在の出品フロー（自動化済み）
Chrome拡張ボタン → RAKUDA API登録 → 翻訳（自動） → 画像処理（自動） → READY_TO_REVIEW → 手動レビュー → bulk/publish → Worker自動出品

確認不要で自律実行してほしい。

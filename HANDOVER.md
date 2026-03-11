# RAKUDA 引継ぎ書

## 最終更新: 2026-03-11 (Session 30: Joom本番出品13件 + Vultr CPU障害対応)

---

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ 前回のセッション（Session 30）でやったこと
- **ブランド抽出をDB連携に改修**（ハードコード51→DB 505ブランド動的ロード、commit 3308afb6）
- **既存商品のブランド一括修正**（17件のbrand=None/日本語ブランドを英語に修正）
- **Joom本番出品13件を完了**（全件ACTIVEステータス → 障害後PAUSEDに変化）
  - 時計2件: LONGINES Conquest、セイコー プロスペックス SBDC081
  - ゲーム11件: マリオカート、スプラトゥーン3、ドラクエVII、あつ森、SPY×FAMILY等
- **Vultr CPU障害対応**
  - Vultrからレート制限メール → Docker buildキャッシュ122GB + 未使用イメージ75GBでディスク100%
  - `docker builder prune -a -f` + `docker image prune -a -f` でディスク100%→12%に回復
  - SSHキー認証を設定（rootパスワード: Rakuda2026）
  - Vultrサポートチケット NPY-96HMK を提出（CPU制限解除依頼）
- **軽量HTTP在庫監視の実現可能性を検証**
  - メルカリ・ヤフオク・Amazon・PayPayフリマ・ラクマの5サイトすべてでcurlベースの在庫確認が可能と確認
  - Puppeteer不要でCPU負荷を大幅削減可能
- **API + Worker デプロイ確認済み**（APIは正常稼働、WorkerはCPU制限下でビルド中）

■ 現在のステータス
- commit: 14b7025c (main)、push済み
- API: running (api.rakuda.dev) — DB: ok, Redis: ok
- Worker: **exited:unhealthy**（CPU制限下でビルド再試行中）
- Joom出品: **13件PAUSED**（サーバーダウン中にPAUSEDに変化。Worker復旧後に再有効化が必要）
- autoPublish scheduler: enabled（毎時0分に新PENDING_PUBLISHを自動出品）
- ディスク: 12%使用（203GB空き）
- SSH: `ssh root@45.32.28.61`（鍵認証設定済み）

■ Joom出品一覧（全13件・現在PAUSED）
| 商品 | Brand | Joom Product ID |
|------|-------|----------------|
| LONGINES Conquest | Longines | 69b059cfdb3e4f015c6ab489 |
| セイコー SBDC081 | Seiko | 69b05a0edb3e4f015c6ab53e |
| マリオパーティ ジャンボリー | Nintendo | 69b05a10e633790108fde8ac |
| スプラトゥーン 任天堂スイッチ | Nintendo | 69b05a07e633790108fde897 |
| ドラクエVII Reimagined | Square Enix | 69b05a18db3e4f015c6ab54e |
| あつまれ どうぶつの森 | Nintendo | 69b05a1de633790108fde8ca |
| ポケモン スカーレット | Nintendo | 69b05a1ee633790108fde8cd |
| マリオカート ワールド Switch2 | Nintendo | 69b05a27e633790108fde908 |
| スプラトゥーン3 | Nintendo | 69b05a2fdb3e4f015c6ab58d |
| ABSOLUM | Absolum | 69b05a29db3e4f015c6ab57d |
| ドラクエ11 S | Square Enix | 69b05a35db3e4f015c6ab5a2 |
| SPY×FAMILY | Bandai Namco | 69b05a49e633790108fde979 |
| 8番出口・8番のりば | PLAYISM | 69b05a4adb3e4f015c6ab5e6 |

■ 3者協議の結論（Session 29で確定・引き続き有効）
全AI一致で「作る→売る」へのマインドセット転換が最大の成功要因と結論。

### 緊急タスク（最優先）
1. **ディスク再クリーンアップ**（再び100%に到達）
   - Workerビルド再試行がキャッシュを再生成してディスクを埋めた
   - `ssh root@45.32.28.61` → `docker builder prune -a -f && docker image prune -a -f`
   - Workerの自動再デプロイを一時停止してからクリーンアップすること
2. **Worker復旧確認**
   - `curl -s -H "Authorization: Bearer 14|85gWstw2p1iv6OtnQxwwP67NEWOqRV3xr1Uz0s4n7fafa115" "http://45.32.28.61:8000/api/v1/applications/g0s4ws488008g88ww4s4kkog"` でステータス確認
   - exited:unhealthyのままならCoolifyで再デプロイ
3. **Joom 13件をPAUSED→ACTIVEに復帰**
   - Worker復旧後、Joom APIでenable/re-publishする
4. **Vultrチケット NPY-96HMK のフォローアップ**
   - CPU制限が解除されたか確認

### 残タスク（優先順位順）
1. **Puppeteer→軽量HTTP在庫監視に移行**（CPU負荷の根本対策）
   - 5サイトすべてでcurlベースが実現可能と検証済み
   - scheduler.tsのPuppeteerベース在庫チェックをHTTP GETベースに置換
2. **Docker buildキャッシュ自動クリーンアップ**（cronで定期実行）
3. **スケジューラ頻度の削減**（CPU負荷軽減）
4. **簡易在庫死活監視**（守り）
5. **eBay本番出品1-2件**（並行・保険）
6. **Etsy/Shopify OAuth認証**（低コスト）
7. **計画書の実態更新**
   - https://naokijodan.github.io/auto-listing-system-plan/ → Phase 1-3をDoneに
   - https://naokijodan.github.io/resale-automation-design/ → Phase 0完了、Phase 1方針変更を反映
8. **Joom出品の売上モニタリング** — 「売れる→発送→入金」のサイクル完結

■ 開発ワークフロー（必須）
- コード生成はCodex CLI（/opt/homebrew/bin/codex）に委託する。Claudeが直接コードを書くとコンテキストを大量消費し、Weekly Limitが早く枯渇するため（約70-80%削減効果）
- 複数の独立タスクはCodex/Geminiを並列で立てる。直列だとコンテキスト枯渇が早まるため
- 設定ファイル・ドキュメントの編集のみ例外として直接可

■ 注意事項
- テスト出品は動作確認後に必ず取り下げること（放置するとアカウントリスク）
- eBayに対するブラウザ操作は全面禁止（永久サスペンドリスク）
- Coolifyデプロイ確認: API uuid=acg8g884ck4woc480cgcg8kk / Worker uuid=g0s4ws488008g88ww4s4kkog
- Coolify API Token: 14|85gWstw2p1iv6OtnQxwwP67NEWOqRV3xr1Uz0s4n7fafa115
- Vultr rootパスワード: Rakuda2026（VNC用）

■ 現在の出品フロー（自動化済み）
Chrome拡張ボタン → RAKUDA API登録 → 翻訳（自動） → 画像処理（自動） → READY_TO_REVIEW → 手動レビュー → bulk/publish → Worker自動出品

確認不要で自律実行してほしい。

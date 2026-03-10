# RAKUDA 引継ぎ書

## 最終更新: 2026-03-11 (Session 30: Joom本番出品13件完了)

---

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ 前回のセッション（Session 30）でやったこと
- **ブランド抽出をDB連携に改修**（ハードコード51→DB 505ブランド動的ロード、commit 3308afb6）
- **既存商品のブランド一括修正**（17件のbrand=None/日本語ブランドを英語に修正）
- **Joom本番出品13件を完了**（全件ACTIVEステータス）
  - 時計2件: LONGINES Conquest、セイコー プロスペックス SBDC081
  - ゲーム11件: マリオカート、スプラトゥーン3、ドラクエVII、あつ森、SPY×FAMILY等
- **API + Worker デプロイ確認済み**（正常稼働中）

■ 現在のステータス
- commit: 3308afb6 (main)、push済み
- API: running (api.rakuda.dev) — DB: ok, Redis: ok
- Worker: running
- Joom出品: **13件ACTIVE**（初の本番出品成功）
- autoPublish scheduler: enabled（毎時0分に新PENDING_PUBLISHを自動出品）

■ Joom出品一覧（全13件ACTIVE）
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

### 残タスク（優先順位順）
1. ~~**ブランド抽出の強化**~~ → ✅ 完了（DB 505ブランド連携）
2. **簡易在庫死活監視**（守り）
   - 仕入れ元URLのHTTP 404/売り切れ文言を1日1回チェック
   - 既存のPuppeteerベース在庫チェックあり（scheduler.ts）が重い
   - 軽量HTTP GETベースの簡易版を検討
3. ~~**Joom本番出品10件**~~ → ✅ 完了（13件ACTIVE）
4. **eBay本番出品1-2件**（並行・保険）
5. **Etsy/Shopify OAuth認証**（低コスト）
6. **計画書の実態更新**
   - https://naokijodan.github.io/auto-listing-system-plan/ → Phase 1-3をDoneに
   - https://naokijodan.github.io/resale-automation-design/ → Phase 0完了、Phase 1方針変更を反映
7. **Joom出品の売上モニタリング** — 「売れる→発送→入金」のサイクル完結

■ 開発ワークフロー（必須）
- コード生成はCodex CLI（/opt/homebrew/bin/codex）に委託する。Claudeが直接コードを書くとコンテキストを大量消費し、Weekly Limitが早く枯渇するため（約70-80%削減効果）
- 複数の独立タスクはCodex/Geminiを並列で立てる。直列だとコンテキスト枯渇が早まるため
- 設定ファイル・ドキュメントの編集のみ例外として直接可

■ 注意事項
- テスト出品は動作確認後に必ず取り下げること（放置するとアカウントリスク）
- eBayに対するブラウザ操作は全面禁止（永久サスペンドリスク）
- Coolifyデプロイ確認: API uuid=acg8g884ck4woc480cgcg8kk / Worker uuid=g0s4ws488008g88ww4s4kkog
- Coolify API Token: 14|85gWstw2p1iv6OtnQxwwP67NEWOqRV3xr1Uz0s4n7fafa115

■ 現在の出品フロー（自動化済み）
Chrome拡張ボタン → RAKUDA API登録 → 翻訳（自動） → 画像処理（自動） → READY_TO_REVIEW → 手動レビュー → bulk/publish → Worker自動出品

確認不要で自律実行してほしい。

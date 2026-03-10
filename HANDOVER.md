# RAKUDA 引継ぎ書

## 最終更新: 2026-03-11 (Session 29後半: 3者協議による軌道修正)

---

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ 前回のセッション（Session 29）でやったこと
- **Joomテスト出品4件を取り下げ**（API経由で全件削除完了）
- **Joomブランド設定問題の修正**（デフォルト値 'Unbranded' 設定、commit 21f9b671）
- **ABSOLUM商品名重複問題の修正**（翻訳プロンプトにブランド名重複防止ルール追加）
- **Chrome拡張CSVヘッダー順序を正規に復元**（title先頭に戻す）
- **Chrome拡張アイコンをRAKUDA独自デザインに差し替え**（ラクダアイコン生成・配置）
- **API + Worker デプロイ済み**（Coolify経由、完了確認はまだ）
- **3者協議で軌道修正を実施** — 「作る」から「売る」フェーズへの転換を決定

■ 現在のステータス
- commit: bdb82f19 (main)、push済み
- API デプロイ: in_progress → 完了確認が必要
- Worker デプロイ: queued → 完了確認が必要
- Joomテスト出品: 全件取り下げ済み（アカウントリスク解消）
- LONGINES商品（cmmkqpfnm0001wt3mte4zol2g）: **READY_TO_REVIEW**（翻訳・画像処理完了済み、brand=null）

■ 3者協議の結論（最重要）
全AI一致で「作る→売る」へのマインドセット転換が最大の成功要因と結論。
以下の優先順位で進める:

### 優先順位（3者合意済み）
1. **ブランド抽出の強化**（最優先・守り）
   - AI抽出（OpenAI）の精度を主軸に
   - BRAND_PATTERNSを40→200-300に拡充（時計・ファッション・ゲーム中心）
   - 「Unbranded」乱用は高単価商品で市場価値を50%以上削るため禁止
   - Joomのbrandフィールドは自由入力文字列（API経由のブランド申請は不要と確認済み）

2. **簡易在庫死活監視**（守り）
   - 仕入れ元URLのHTTP 404/売り切れ文言を1日1回チェック
   - 完全な在庫同期（Phase 4）の前の最小実装
   - 売り切れ商品を売り続けるリスクを防ぐ

3. **Joom本番出品10件**（攻め）
   - デプロイ完了確認後
   - LONGINES商品（READY_TO_REVIEW）のbrandを "Longines" に更新して出品
   - 「売れる→発送する→入金される」のキャッシュフロー1サイクルを完結させる

4. **eBay本番出品1-2件**（並行・保険）
   - Joomカテゴリ要件（オレンジドット）でブロックされた場合の保険

5. **Etsy/Shopify OAuth認証**（低コスト）
   - 設定のみで販路分散のリスクヘッジ

6. **計画書の実態更新**
   - https://naokijodan.github.io/auto-listing-system-plan/ → Phase 1-3をDoneに
   - https://naokijodan.github.io/resale-automation-design/ → Phase 0完了、Phase 1方針変更を反映
   - 統合はせず個別更新（3者合意）

■ Joomブランド関連の調査結果
- Joom API v3にブランド申請/登録エンドポイントは**存在しない**（72エンドポイント中ゼロ）
- `brand`フィールドは商品作成/更新時の**自由入力文字列**
- IP Rights認証はMerchant Portal（Web UI）経由のみ（正規販売者として出品する場合のみ必要）
- 「Your product does not have a Brand」エラーはbrandフィールド未入力が原因 → 修正済み

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
Chrome拡張ボタン → RAKUDA API登録 → 翻訳（自動） → 画像処理（自動） → READY_TO_REVIEW → 手動レビュー → 出品

確認不要で自律実行してほしい。

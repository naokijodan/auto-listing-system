# RAKUDA 引継ぎ書

## 最終更新: 2026-03-11 (Session 28: RAKUDA Chrome拡張作成・キュー自動投入)

---

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ 前回のセッション（Session 28）でやったこと
- **RAKUDA とりこみ君 Chrome拡張を作成**
  - とりこみ君をコピーし、出力先を「Google Sheets / RAKUDA API / 両方」で切り替え可能に
  - 全8プラットフォーム対応のスクレイピングロジックはそのまま維持
  - 設定画面でモード切替、RAKUDA API URL設定、接続テスト機能
  - 配置: `extensions/chrome/`
- **CSVバリデーション falsyバグ修正**（commit 0dd7ad4e）
  - `!headerMapping.title` で index 0 が falsy → `headerMapping.title === undefined` に修正
  - priceも同様に修正
- **CSVインポート時のキュー自動投入**（commit df497fb0）
  - `POST /api/products/import` で商品新規作成時に `addFullWorkflowJob` を自動呼び出し
  - 翻訳→画像処理→READY_TO_REVIEW まで自動で流れる
- **API + Worker デプロイ完了**（Coolify経由）

■ 現在のステータス
- commit: df497fb0 (main)、push済み、API+Workerデプロイ済み
- Chrome拡張 → RAKUDA API 直接送信: 動作確認済み（LONGINES Conquest テスト成功）
- LONGINES商品（cmmkqpfnm0001wt3mte4zol2g）: 手動でキュー投入済み、翻訳・画像処理中
- Joomテスト出品4件: まだ取り下げていない（要対応）
  - 69afd12245c6d4018cec14ee (スプラトゥン)
  - 69afd12445c6d4018cec14f2 (ドラゴンクエスト11 S)
  - 69afd13016248e0119ca95d8 (ABSOLUM)
  - 69afd12ea9cb14017cabcdcf (ポケモンスカーレット)

■ 次にやること
1. **Joomテスト出品4件を取り下げる**（放置するとアカウントリスク）
2. **Joomブランド設定問題の修正**（最優先）
   - "Your product does not have a Brand" エラー対応
   - AIブランド抽出精度向上 or デフォルト値("Unbranded")設定
   - Joom Merchant PortalのBrand Authorization要件も確認が必要
3. **ABSOLUM商品名重複問題の修正**（「アブソラム ABSOLUM」→「ABSOLUM ABSOLUM」になる）
4. **Chrome拡張のCSVヘッダー順序を元に戻す**
   - background.jsで暫定的にpriceを先頭にしている（falsyバグ回避）
   - APIデプロイ済みなので `['title','price',...]` に戻してOK
5. Chrome拡張のアイコンをRAKUDA独自のものに差し替え（現在はとりこみ君のアイコンを復元しただけ）

■ 開発ワークフロー（必須）
- コード生成はCodex CLI（/opt/homebrew/bin/codex）に委託する。Claudeが直接コードを書くとコンテキストを大量消費し、Weekly Limitが早く枯渇するため（約70-80%削減効果）
- 複数の独立タスクはCodex/Geminiを並列で立てる。直列だとコンテキスト枯渇が早まるため
- 設定ファイル・ドキュメントの編集のみ例外として直接可

■ 注意事項
- テスト出品は審査完了後に必ず取り下げること（放置するとアカウントリスク）
- Joom Category Requirements で Electronics にオレンジドットあり（追加要件あり）
- eBayに対するブラウザ操作は全面禁止（永久サスペンドリスク）
- Coolifyデプロイは20-30分かかる。API経由: `GET http://45.32.28.61:8000/api/v1/deploy?uuid={app_uuid}&force=true`

■ 現在の出品フロー（自動化済み）
Chrome拡張ボタン → RAKUDA API登録 → 翻訳（自動） → 画像処理（自動） → READY_TO_REVIEW → 手動レビュー → 出品

確認不要で自律実行してほしい。

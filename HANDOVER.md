# RAKUDA 引継ぎ書

## 最終更新: 2026-03-11 (Session 29: Joom修正・Chrome拡張改善)

---

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ 前回のセッション（Session 29）でやったこと
- **Joomテスト出品4件を取り下げ**（API経由で全件削除完了）
- **Joomブランド設定問題の修正**（デフォルト値 'Unbranded' 設定）
- **ABSOLUM商品名重複問題の修正**（翻訳プロンプトにブランド名重複防止ルール追加）
- **Chrome拡張CSVヘッダー順序を正規に復元**（title先頭に戻す）
- **Chrome拡張アイコンをRAKUDA独自デザインに差し替え**（ラクダアイコン生成・配置）
- API + Worker デプロイ開始（20-30分で完了見込み）

■ 現在のステータス
- commit: 21f9b671 (main)、push済み
- API + Worker: デプロイ中（Coolify経由）
- Joomテスト出品: 全件取り下げ済み（アカウントリスク解消）
- LONGINES商品（cmmkqpfnm0001wt3mte4zol2g）: 翻訳・画像処理結果を確認中

■ 次にやること
1. **デプロイ完了確認**（API + Worker）
2. **Joom再出品テスト**（ブランド修正 'Unbranded' の動作確認）
3. **翻訳品質確認**（ABSOLUM重複修正が正しく機能するかテスト）
4. **LONGINES商品の処理結果確認**（翻訳・画像処理完了しているか）
5. **Etsy/Shopify OAuth認証実行**（次のマイルストーン）

■ 開発ワークフロー（必須）
- コード生成はCodex CLI（/opt/homebrew/bin/codex）に委託する。Claudeが直接コードを書くとコンテキストを大量消費し、Weekly Limitが早く枯渇するため（約70-80%削減効果）
- 複数の独立タスクはCodex/Geminiを並列で立てる。直列だとコンテキスト枯渇が早まるため
- 設定ファイル・ドキュメントの編集のみ例外として直接可

■ 注意事項
- テスト出品は必ず取り下げること（放置するとアカウントリスク）
- eBayに対するブラウザ操作は全面禁止（永久サスペンドリスク）
- Coolifyデプロイは20-30分かかる。API経由: `GET http://45.32.28.61:8000/api/v1/deploy?uuid={app_uuid}&force=true`

■ 現在の出品フロー（自動化済み）
Chrome拡張ボタン → RAKUDA API登録 → 翻訳（自動） → 画像処理（自動） → READY_TO_REVIEW → 手動レビュー → 出品

確認不要で自律実行してほしい。

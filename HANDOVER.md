# RAKUDA 引継ぎ書

## 最終更新: 2026-03-11 (Session 32: Joom削除フロー修正・UI監査)

---

RAKUDAプロジェクト（~/Desktop/rakuda/）の続きをお願いする。

■ 前回のセッション（Session 32）でやったこと
- **Joom全13件を削除**（Joom API側もDB側も0件にクリーンアップ）
- **Joom削除フローを修正**（commit 66d7e10b）
  - DELETE /api/joom/listings/:id がBullMQキュー経由→Joom API直接呼び出しに変更
  - Joom API成功後にDB削除する順序に修正
  - JSONレスポンス返却（204廃止）
- **Joom enable/disableも同期化**（commit 68acef4c）
  - 同様にキュー経由→直接API呼び出しに変更
- **deleteApi関数の204対応**（commit a9d71dad）
  - apps/web/src/lib/api.ts: 204 No Contentの場合は空オブジェクト返却
- **商品管理ページ（/listings）のボタン接続**（commit bb66ad98）
  - 削除・一括停止・再出品・エクスポートのonClickハンドラー実装
  - ステータスフィルターのバグ修正（PUBLISHED→ACTIVE）
- **Web UI全タブの機能監査を実施**
- **3者協議でUI整理方針を決定**

■ 次にやること【最優先：UI整理】
3者協議の結論に基づき、「動くものだけ見せる」整理を実施する。

### タスク1: 未実装ボタンの非表示
以下のボタンはonClickハンドラーがなく、クリックしても何も起きないため非表示にする：
- /listings: 「価格一括変更」ボタン
- /products: 「一括編集」「価格一括変更」ボタン
- /settings: 保存機能のない設定セクション全体（入力しても保存されない）
- /marketplace: ルーティング設定セクション（ローカルstateのみ、リロードで消える）

### タスク2: 未使用eBayページをナビから除外
eBay専用40+ページのうち、実運用で使うのはコア3ページのみ：
- ✅ 残す: eBay認証、eBay出品、eBay注文
- ❌ ナビから外す: レビュー管理、財務、SEO、多言語、テンプレート等（コードは削除せずルートから除外）

### タスク3: Settings保存機能の実装
- 価格設定・同期スケジュールのDB永続化
- バックエンドAPIは /api/settings/* で一部実装済み

### タスク4: Marketplace永続化
- ルーティング設定（価格ルール等）のDB保存

### 調査の実施方法
まず以下を確認してから作業開始すること：
1. ナビゲーション/サイドバーコンポーネントの場所を特定
2. 各ページのボタン一覧と実装状況を再確認
3. eBayページの一覧とナビへの登録状況を確認

■ 現在のステータス
- commit: bb66ad98 (main)、push済み
- API: running (api.rakuda.dev) — 最新コードデプロイ済み
- Worker: running
- Web: デプロイ済み（listings修正含む）
- ディスク: 15%使用
- CPU: 66% steal time（Vultr制限まだ有効）
- Joom出品: 0件（全削除済み・整理後に再出品予定）
- eBay出品: 0件（Session 31で取り下げ済み）
- Shopify: 1件 ACTIVE

■ UI監査結果サマリー（Session 32で実施）
| ページ | 実装度 | 主な問題 |
|--------|--------|----------|
| /joom | 95% | ほぼ完成 |
| /batch | 95% | SSEリアルタイム監視含む |
| /inventory | 95% | ほぼ完成 |
| /products/review | 95% | キーボードショートカット含む |
| /pricing-ai | 90% | ほぼ完成 |
| /orders | 90% | 追跡入力UIがPrompt() |
| /marketplace | 85% | ルーティング設定の永続化なし |
| /listings | 80% | 価格一括変更のみ未実装 |
| /products | 75% | 一括編集・価格変更未実装 |
| /settings | 30% | 保存機能ほぼ未実装 |
| eBay専用40+ページ | 35% | UIのみ、API連携が途中 |

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

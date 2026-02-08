# RAKUDA クイックスタート - 次セッション用

## コピペ用指示

以下をそのまま次のセッションに貼り付けてください:

---

```
RAKUDAプロジェクトの続きをお願いします。

まず以下を読んでください:
- /Users/naokijodan/Desktop/rakuda/docs/HANDOVER_20260208.md（引き継ぎ書）
- /Users/naokijodan/Desktop/rakuda/docs/NEXT_SESSION_INSTRUCTIONS.md（指示書）

Phase 44として、3つのエージェントを並列で起動してください:

【エージェント1: テスト担当】
Phase 44-A: marketplace-sync.test.ts作成
- inventory-sync.ts、order-sync.ts、price-sync.tsの統合テスト
- カバレッジ80%以上

【エージェント2: バックエンド担当】
Phase 44-B: 同期スケジュール動的設定
- Prismaスキーマ追加（MarketplaceSyncSetting）
- settings.ts API作成
- scheduler.ts改修

【エージェント3: フロントエンド担当】
Phase 44-C: 同期スケジュール設定UI
- settings/page.tsx に編集フォーム追加
- Joom/eBay別設定

3つとも並列で進めて、完了したら各自コミット・プッシュしてください。
```

---

## 代替指示（シンプル版）

```
RAKUDAの続きです。

/Users/naokijodan/Desktop/rakuda/docs/HANDOVER_20260208.md を読んで、
Phase 44の作業を3つのエージェントで並列実行してください。

指示詳細: /Users/naokijodan/Desktop/rakuda/docs/NEXT_SESSION_INSTRUCTIONS.md
```

---

## 単一エージェント版

並列実行が不要な場合:

```
RAKUDAの続きです。

引き継ぎ書: /Users/naokijodan/Desktop/rakuda/docs/HANDOVER_20260208.md

Phase 44として以下を順番に実装してください:
1. 統合テスト追加（marketplace-sync.test.ts）
2. 同期スケジュール動的設定API
3. 同期スケジュール設定UI

どんどん進めてください。
```

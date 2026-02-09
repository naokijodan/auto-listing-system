# 次セッション用指示文

## 起動コマンド

```bash
cd ~/Desktop/rakuda
claude --dangerously-skip-permissions
```

---

## 以下をペースト

```
RAKUDAプロジェクトの開発を継続する。

【引き継ぎ書】
docs/HANDOVER_20260210.md を読んでから開始せよ。

【実行モード】
- claude --dangerously-skip-permissions で起動済み
- 確認なしで最後まで自律実行せよ
- 設計判断が必要な場合のみ3者協議（multi_discuss）を実行

【作業開始前の必須タスク】
1. 引き継ぎ書（docs/HANDOVER_20260210.md）を読む
2. 3者協議でPhase 41の詳細設計を確定
3. 設計確定後、実装を開始

【今回の目標】
Phase 41: 本番基盤構築（DevOps & Observability）
- 41-A: Docker本番環境構築
- 41-B: 観測基盤（Observability）
- 41-C: CI/CD強化

並走: Phase 42の最小E2Eテスト設計

【作業完了時の必須タスク】
1. git add → git commit → git push
2. Obsidianノート作成: /開発ログ/rakuda_phase41_{内容}_{日付}.md
3. 引き継ぎ書の更新: docs/HANDOVER_20260210.md → 新しい日付のファイルを作成

【禁止事項】
- 途中での確認要求
- 不要な説明や前置き
- 作業完了前の中断

開始せよ。
```

---

## 備考

- 3者協議は `mcp__ai-discussion__multi_discuss` ツールを使用
- 設計判断が必要な場合: topic と claude_opinion を設定して実行
- 引き継ぎ書は `/Users/naokijodan/Desktop/rakuda/docs/HANDOVER_20260210.md`

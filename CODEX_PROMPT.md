# Codex用プロンプト（コピペ用）

以下をCodex CLIまたはChatGPTに貼り付けてください。

---

## プロンプト

```
以下の仕様でTypeScriptファイルを2つ生成してください。

## 共通パターン

### APIファイル構造（28エンドポイント）
- ダッシュボード: 5エンドポイント（/dashboard, /dashboard/stats, /dashboard/recent, /dashboard/performance, /dashboard/alerts）
- メイン機能: 6エンドポイント（CRUD + duplicate）
- サブ機能1: 4エンドポイント
- サブ機能2: 4エンドポイント
- サブ機能3: 4エンドポイント
- 分析: 3エンドポイント
- 設定: 2エンドポイント

### UIファイル構造（6タブ）
- Next.js App Router ('use client')
- shadcn/ui コンポーネント使用
- SWRでデータフェッチ
- 各タブにダミーデータ表示

---

## Phase 293: Buyer Analytics（バイヤー分析）

### APIファイル: ebay-buyer-analytics.ts
- テーマカラー: pink-600
- エンドポイント例:
  - /dashboard - 総バイヤー数、リピート率、平均購入額
  - /buyers - バイヤー一覧（id, name, totalPurchases, lastPurchase）
  - /buyers/:id - バイヤー詳細
  - /segments - セグメント一覧（VIP, Regular, New）
  - /behavior - 行動分析（閲覧→購入率など）
  - /reports - レポート生成
  - /settings - 設定

### UIファイル: page.tsx (ebay/buyer-analytics/)
- タブ: ダッシュボード、バイヤー、セグメント、行動分析、レポート、設定
- h1タイトル: "バイヤー分析" (text-pink-600)

---

## Phase 294: Supply Chain Manager（サプライチェーン管理）

### APIファイル: ebay-supply-chain-manager.ts
- テーマカラー: orange-600
- エンドポイント例:
  - /dashboard - 総サプライヤー数、発注中、在庫状況
  - /suppliers - サプライヤー一覧
  - /suppliers/:id - サプライヤー詳細
  - /orders - 発注一覧
  - /orders/:id - 発注詳細
  - /inventory - 在庫管理
  - /logistics - 物流追跡
  - /settings - 設定

### UIファイル: page.tsx (ebay/supply-chain-manager/)
- タブ: ダッシュボード、サプライヤー、発注、在庫、物流、設定
- h1タイトル: "サプライチェーン管理" (text-orange-600)

---

## 出力形式

各ファイルの完全なコードを出力してください：

1. **ebay-buyer-analytics.ts** (APIファイル)
2. **buyer-analytics/page.tsx** (UIファイル)
3. **ebay-supply-chain-manager.ts** (APIファイル)
4. **supply-chain-manager/page.tsx** (UIファイル)

インポート文から始めて、export defaultまで完全なコードをお願いします。
```

---

## Codex実行後

生成されたコードをこのチャットに貼り付けるか、ファイルとして保存してパスを教えてください。

私が以下を担当します：
1. ファイルを正しい場所に配置
2. index.ts にルート追加
3. Git commit & push
4. Obsidianノート作成

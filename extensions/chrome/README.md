# RAKUDA Chrome Extension

越境EC商品登録のためのChrome拡張機能

## 機能

- ヤフオク、メルカリ、Amazon JPの商品ページからワンクリックで登録
- 商品情報（タイトル、価格、画像）の自動抽出
- 右クリックメニューからも登録可能
- 最近の登録履歴表示

## 対応サイト

| サイト | URL |
|--------|-----|
| ヤフオク | `auctions.yahoo.co.jp` |
| メルカリ | `mercari.com` |
| Amazon JP | `amazon.co.jp` |

## インストール方法

### 開発モード（ローカル）

1. Chromeで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をON
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `extensions/chrome` フォルダを選択

### 設定

1. 拡張機能のアイコンをクリック
2. 右上の⚙️（設定）をクリック
3. API URLを入力（デフォルト: `http://localhost:3000`）
4. 必要に応じてAPI Keyを入力
5. 「接続テスト」で疎通確認
6. 「保存」をクリック

## 使い方

### ポップアップから登録

1. 対応サイトの商品ページを開く
2. ツールバーのRAKUDAアイコンをクリック
3. 商品プレビューを確認
4. 「RAKUDAに登録」ボタンをクリック

### 右クリックメニューから登録

1. 対応サイトの商品ページで右クリック
2. 「RAKUDAに商品を登録」を選択

## 開発

### アイコン生成

```bash
cd extensions/chrome
node generate-icons.js
```

### ファイル構成

```
extensions/chrome/
├── manifest.json      # 拡張機能設定（Manifest V3）
├── background.js      # Service Worker
├── content.js         # コンテンツスクリプト
├── popup.html         # ポップアップUI
├── popup.js           # ポップアップロジック
├── styles.css         # スタイル
├── generate-icons.js  # アイコン生成スクリプト
└── icons/
    ├── icon.svg       # ソースアイコン
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## トラブルシューティング

### 「接続できません」エラー

- RAKUDA APIサーバーが起動しているか確認
- API URLが正しいか確認（`http://localhost:3000`）
- CORSが有効か確認

### 商品情報が取得できない

- ページが完全に読み込まれているか確認
- 対応サイトの商品詳細ページか確認
- サイトのHTML構造が変更された可能性あり

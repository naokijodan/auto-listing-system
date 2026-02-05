# RAKUDA セキュリティガイド

## 概要

RAKUDAのセキュリティ設定と運用に関するガイドラインです。

## API認証

### API Key認証

すべてのAPIリクエスト（ヘルスチェックを除く）には、API Keyが必要です。

#### 設定方法

1. **API Keyの生成**
   ```bash
   # 強力なランダムキーを生成
   openssl rand -hex 32
   ```

2. **環境変数に設定**
   ```bash
   # .env
   API_KEY="生成したキー"
   AUTH_ENABLED=true
   ```

#### 使用方法

```bash
# リクエストヘッダーにAPI Keyを含める
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/products
```

### 認証設定オプション

| 環境変数 | デフォルト | 説明 |
|---------|-----------|------|
| `API_KEY` | なし | API認証キー |
| `AUTH_ENABLED` | `true` | 認証の有効/無効 |
| `AUTH_MAX_FAILED_ATTEMPTS` | `5` | ロックアウトまでの失敗回数 |
| `AUTH_LOCKOUT_DURATION_MS` | `900000` | ロックアウト期間（15分） |

### 公開エンドポイント

以下のエンドポイントは認証なしでアクセス可能です：

- `/api/health` - ヘルスチェック
- `/api/health/live` - 生存確認
- `/api/health/ready` - 準備完了確認

## ブルートフォース対策

連続して認証に失敗すると、IPアドレスが一時的にブロックされます。

- **閾値**: 5回連続失敗
- **ロックアウト期間**: 15分
- **リセット**: 認証成功時に自動リセット

### ロックアウト時のレスポンス

```json
{
  "success": false,
  "error": "Too many failed attempts. Please try again later.",
  "retryAfter": 900
}
```

## CORS設定

### 設定方法

```bash
# .env
CORS_ORIGINS="https://your-domain.com,https://admin.your-domain.com"
```

### 推奨設定

- **開発環境**: `http://localhost:3002,http://localhost:3000`
- **本番環境**: 自ドメインのみを許可

## 秘密情報の管理

### .envファイル

- `.env`ファイルは**絶対にコミットしない**
- `.env.example`をテンプレートとして使用
- 本番の秘密情報は環境変数で直接設定

### 機密性の高い情報

以下の情報は特に厳重に管理してください：

- `API_KEY` - API認証キー
- `DATABASE_URL` - データベース接続文字列
- `EBAY_*` - eBay API認証情報
- `OPENAI_API_KEY` - OpenAI APIキー

## セキュリティチェックリスト

### デプロイ前

- [ ] `API_KEY`が十分に強力（32バイト以上のランダム文字列）
- [ ] `AUTH_ENABLED=true`になっている
- [ ] `.env`が`.gitignore`に含まれている
- [ ] CORS設定が本番ドメインのみに制限されている
- [ ] HTTPSが有効になっている
- [ ] データベースのパスワードが強力

### 定期的なチェック

- [ ] 認証失敗ログの確認
- [ ] API Keyのローテーション（推奨: 90日ごと）
- [ ] 依存パッケージのセキュリティアップデート
- [ ] バックアップの暗号化確認

## インシデント対応

### API Key漏洩時

1. 即座に新しいAPI Keyを生成
2. 環境変数を更新
3. アプリケーションを再起動
4. アクセスログを確認

```bash
# 新しいキーを生成
openssl rand -hex 32

# 環境変数を更新
export API_KEY="new-api-key"

# アプリケーションを再起動
docker compose restart api
```

### 不正アクセス検知時

1. 該当IPをブロック（ファイアウォール）
2. ログを保存
3. 影響範囲を調査
4. 必要に応じてAPI Keyをローテーション

## HTTPS設定（本番環境）

### Let's Encrypt証明書

```bash
# Certbotをインストール
apt install certbot python3-certbot-nginx

# 証明書を取得
certbot --nginx -d your-domain.com

# 自動更新を確認
certbot renew --dry-run
```

### Nginx設定例

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 関連ドキュメント

- `/docs/backup-restore.md` - バックアップ・リストア手順
- `/.env.example` - 環境変数テンプレート

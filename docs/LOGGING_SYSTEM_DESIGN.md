# RAKUDA ログ集約・監視システム設計

## 1. 概要

RAKUDAシステムのログ集約・監視機能。ファイルベースのログ保存、検索、エクスポート機能を提供。

## 2. アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   API Server    │     │     Worker      │     │   Web Server    │
│    (Express)    │     │    (BullMQ)     │     │    (Next.js)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      @rakuda/logger (Pino)                      │
│   - 構造化ログ出力                                               │
│   - シークレットマスキング                                        │
│   - コンテキスト付きログ                                          │
└────────────────────────────────┬────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Console      │     │   Log Files     │     │     Redis       │
│   (dev only)    │     │   (production)  │     │   (metrics)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  LogAggregator  │
                        │  - ローテーション │
                        │  - 検索          │
                        │  - エクスポート   │
                        └─────────────────┘
```

## 3. コンポーネント

### 3.1 @rakuda/logger

Pinoベースのロギングライブラリ。

```typescript
import { logger, createJobLogger, createRequestLogger } from '@rakuda/logger';

// 基本的な使用
logger.info({ type: 'user_action', userId: '123' }, 'User logged in');

// ジョブ用ロガー
const jobLog = createJobLogger('job-123', 'scrape-queue');
jobLog.info({ progress: 50 }, 'Processing...');

// リクエスト用ロガー
const reqLog = createRequestLogger('req-456', '/api/products');
reqLog.error({ status: 500 }, 'Request failed');
```

### 3.2 LogAggregator

ファイルベースのログ集約。

```typescript
import { getLogAggregator } from '@rakuda/logger';

const aggregator = getLogAggregator();

// ログ検索
const result = await aggregator.search({
  startTime: new Date('2026-02-08T00:00:00Z'),
  level: 'error',
  module: 'ebay-api',
  limit: 100,
});

// 統計取得
const stats = await aggregator.getStats({ hours: 24 });

// エクスポート
const csv = await aggregator.export({
  level: 'error',
  format: 'csv',
});
```

## 4. ログファイル構成

```
logs/
├── rakuda-2026-02-08.log          # 当日のログ
├── rakuda-2026-02-07-12-00-00.log.gz  # ローテーション済み（圧縮）
├── rakuda-2026-02-06-18-30-00.log.gz
└── ...
```

### ローテーション設定

| 設定 | デフォルト値 | 説明 |
|------|-------------|------|
| maxSize | 10MB | ローテーションサイズ |
| maxFiles | 7 | 保持ファイル数 |
| compress | true | gzip圧縮 |

## 5. API エンドポイント

### 5.1 ログ検索

```
GET /api/monitoring/logs
```

**パラメータ:**
| パラメータ | 型 | 説明 |
|-----------|------|------|
| startTime | ISO8601 | 開始時刻 |
| endTime | ISO8601 | 終了時刻 |
| level | string | ログレベル (debug/info/warn/error) |
| module | string | モジュール名 |
| type | string | ログタイプ |
| jobId | string | ジョブID |
| queueName | string | キュー名 |
| search | string | 全文検索 |
| limit | number | 取得件数 (default: 100, max: 1000) |
| offset | number | オフセット |

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "timestamp": "2026-02-08T12:00:00.000Z",
        "level": "error",
        "module": "ebay-api",
        "message": "API call failed",
        "error": "Connection timeout"
      }
    ],
    "total": 42,
    "hasMore": true
  }
}
```

### 5.2 ログ統計

```
GET /api/monitoring/logs/stats
```

**パラメータ:**
| パラメータ | 型 | 説明 |
|-----------|------|------|
| hours | number | 対象時間 (default: 24, max: 168) |

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "totalEntries": 15000,
    "byLevel": {
      "info": 12000,
      "warn": 2500,
      "error": 500
    },
    "byModule": {
      "api": 5000,
      "worker": 8000,
      "scheduler": 2000
    },
    "byHour": [
      { "hour": "2026-02-08T00", "count": 500, "errors": 10 }
    ],
    "errorRate": 3.33,
    "topErrors": [
      { "message": "Connection timeout", "count": 50 }
    ]
  }
}
```

### 5.3 ログエクスポート

```
GET /api/monitoring/logs/export
```

**パラメータ:**
| パラメータ | 型 | 説明 |
|-----------|------|------|
| format | string | 出力形式 (json/ndjson/csv) |
| その他 | - | ログ検索と同じパラメータ |

**レスポンス:** ファイルダウンロード

## 6. ログレベル定義

| レベル | 用途 |
|--------|------|
| debug | 詳細なデバッグ情報 |
| info | 通常の操作ログ |
| warn | 警告（問題の可能性） |
| error | エラー（要対応） |

## 7. 推奨ログ形式

```typescript
// 操作ログ
logger.info({
  type: 'operation_type',
  userId: '...',
  action: '...',
  result: 'success' | 'failure',
});

// API呼び出し
logger.info({
  type: 'api_call',
  service: 'ebay' | 'joom',
  endpoint: '/path',
  method: 'GET' | 'POST',
  status: 200,
  duration: 150,
});

// エラー
logger.error({
  type: 'error',
  code: 'ERROR_CODE',
  message: 'Human readable message',
  stack: error.stack,
  context: { /* 関連データ */ },
});
```

## 8. 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| LOG_LEVEL | info | ログレベル |
| LOG_DIR | ./logs | ログディレクトリ |
| NODE_ENV | development | 環境（productionでJSON出力） |

## 9. 将来の拡張

### 9.1 外部サービス連携（オプション）

- **Elasticsearch**: 大規模ログ検索
- **Grafana Loki**: Prometheus連携
- **Datadog/New Relic**: APM統合

### 9.2 アラート自動生成

```typescript
// エラー率が閾値を超えた場合に自動通知
if (stats.errorRate > 5) {
  await sendNotification({
    type: 'error_rate_alert',
    message: `エラー率が${stats.errorRate}%に上昇`,
    severity: 'warning',
  });
}
```

## 10. 使用例

### ジョブでのログ出力

```typescript
import { createJobLogger } from '@rakuda/logger';

async function processJob(job) {
  const log = createJobLogger(job.id, job.queueName);

  log.info({ type: 'job_start' }, 'Job started');

  try {
    const result = await doWork();
    log.info({ type: 'job_complete', result }, 'Job completed');
  } catch (error) {
    log.error({
      type: 'job_error',
      error: error.message,
      stack: error.stack,
    }, 'Job failed');
    throw error;
  }
}
```

### APIエンドポイントでのログ出力

```typescript
import { createRequestLogger } from '@rakuda/logger';

app.use((req, res, next) => {
  req.log = createRequestLogger(req.id, req.path);
  req.log.info({ method: req.method }, 'Request received');
  next();
});
```

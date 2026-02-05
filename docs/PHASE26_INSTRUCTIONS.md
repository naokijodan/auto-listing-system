# RAKUDA Phase 26 実装指示書

## 前提条件
- Phase 24-25が完了していること
- PostgreSQL、Redis、Node.js環境が稼働中

---

## Step 1: 定数とスキーマ追加

### 1.1 QUEUE_NAMES追加
**ファイル**: `packages/config/src/constants.ts`

```typescript
// 既存のQUEUE_NAMESにNOTIFICATIONを追加
export const QUEUE_NAMES = {
  SCRAPE: 'scrape',
  IMAGE: 'image',
  TRANSLATE: 'translate',
  PUBLISH: 'publish',
  INVENTORY: 'inventory',
  COMPETITOR: 'competitor',
  PRICE_SYNC: 'price-sync',
  NOTIFICATION: 'notification', // 追加
} as const;
```

### 1.2 Prismaスキーマ追加
**ファイル**: `packages/database/prisma/schema.prisma`

```prisma
// ファイル末尾に追加

// ========================================
// アラートルール
// ========================================
model AlertRule {
  id                 String   @id @default(cuid())
  name               String
  eventType          String
  conditions         Json     @default("[]")
  severity           String   @default("info")
  channels           String[]
  cooldownMinutes    Int      @default(30)
  batchWindowMinutes Int      @default(5)
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@map("alert_rules")
}

// ========================================
// アラートログ
// ========================================
model AlertLog {
  id        String    @id @default(cuid())
  ruleId    String?
  eventType String
  severity  String
  title     String
  message   String    @db.Text
  metadata  Json?
  channels  String[]
  status    String    @default("pending")
  batchId   String?
  sentAt    DateTime?
  errorMsg  String?
  createdAt DateTime  @default(now())

  @@index([eventType, createdAt])
  @@index([status])
  @@index([batchId])
  @@map("alert_logs")
}
```

### 1.3 マイグレーション実行
```bash
cd packages/database
npx prisma migrate dev --name add_alert_tables
npx prisma generate
```

---

## Step 2: AlertManager実装

### 2.1 AlertManagerクラス作成
**ファイル**: `apps/worker/src/lib/alert-manager.ts`

実装内容:
- `processEvent(event)` - イベント受信・ルール評価
- `checkRules(event)` - マッチするルール取得
- `shouldThrottle(ruleId)` - クールダウンチェック
- `batchAlerts(alerts)` - バッチ処理

### 2.2 型定義
**ファイル**: `packages/schema/src/alert.ts`

```typescript
export type AlertEventType =
  | 'INVENTORY_OUT_OF_STOCK'
  | 'PRICE_DROP_DETECTED'
  | 'LISTING_FAILED'
  | 'COMPETITOR_PRICE_CHANGE'
  | 'ORDER_RECEIVED'
  | 'SCRAPE_ERROR';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertEvent {
  type: AlertEventType;
  productId?: string;
  listingId?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface AlertCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
  value: string | number | boolean;
}
```

---

## Step 3: 通知プロセッサー実装

### 3.1 プロセッサー作成
**ファイル**: `apps/worker/src/processors/notification.ts`

```typescript
import { Job } from 'bullmq';
import { sendEmail } from '../lib/email-sender';
import { sendSlackMessage } from '../lib/slack-sender';

export async function processNotificationJob(job: Job) {
  const { channel, template, data, deepLink } = job.data;

  switch (channel) {
    case 'email':
      return sendEmail(template, data);
    case 'slack':
      return sendSlackMessage(template, data, deepLink);
    default:
      throw new Error(`Unknown channel: ${channel}`);
  }
}
```

### 3.2 Email送信
**ファイル**: `apps/worker/src/lib/email-sender.ts`

- Nodemailer使用
- HTMLテンプレート対応

### 3.3 Slack送信
**ファイル**: `apps/worker/src/lib/slack-sender.ts`

- Webhook URL使用
- Block Kit対応

---

## Step 4: 通知テンプレート

### 4.1 テンプレート定義
**ファイル**: `apps/worker/src/lib/notification-templates.ts`

各イベントタイプごとに:
- Email件名・本文
- Slack Block Kit構造
- Deep Linkパス

---

## Step 5: APIエンドポイント

### 5.1 アラートルートer作成
**ファイル**: `apps/api/src/routes/alerts.ts`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /api/alerts/rules | ルール一覧 |
| POST | /api/alerts/rules | ルール作成 |
| GET | /api/alerts/rules/:id | ルール詳細 |
| PUT | /api/alerts/rules/:id | ルール更新 |
| DELETE | /api/alerts/rules/:id | ルール削除 |
| POST | /api/alerts/rules/:id/test | テスト送信 |
| GET | /api/alerts/logs | ログ一覧 |
| GET | /api/alerts/logs/stats | 統計 |
| POST | /api/alerts/send | 手動送信 |

### 5.2 index.tsにルート追加
```typescript
import { alertsRouter } from './routes/alerts';
// ...
app.use('/api/alerts', alertsRouter);
```

---

## Step 6: 既存プロセッサー統合

### 6.1 在庫プロセッサーに統合
**ファイル**: `apps/worker/src/processors/inventory.ts`

在庫切れ検出時:
```typescript
import { alertManager } from '../lib/alert-manager';

// 在庫切れ検出後に追加
if (isOutOfStock) {
  await alertManager.processEvent({
    type: 'INVENTORY_OUT_OF_STOCK',
    productId: product.id,
    listingId: listing.id,
    data: { title: product.title, marketplace: listing.marketplace },
    timestamp: new Date().toISOString(),
  });
}
```

### 6.2 他プロセッサーも同様に統合
- `publish.ts` - 出品失敗時
- `scrape.ts` - スクレイプエラー時
- `competitor-scraper.ts` - 競合価格変動時

---

## Step 7: Worker起動設定

### 7.1 index.tsに追加
**ファイル**: `apps/worker/src/index.ts`

```typescript
import { processNotificationJob } from './processors/notification';

// 通知ワーカー追加
new Worker(
  QUEUE_NAMES.NOTIFICATION,
  processNotificationJob,
  { connection: redis, concurrency: 5 }
);
```

---

## Step 8: 環境変数設定

### 8.1 .env.example更新
```env
# Alert System
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
ALERT_EMAIL_FROM=noreply@rakuda.example.com
SLACK_WEBHOOK_URL=
WEB_APP_URL=http://localhost:3001
```

---

## Step 9: テスト作成

### 9.1 AlertManagerテスト
**ファイル**: `apps/worker/src/test/unit/alert-manager.test.ts`

- ルール評価ロジック
- スロットリング
- バッチ処理

### 9.2 通知APIテスト
**ファイル**: `apps/api/src/test/integration/alerts.test.ts`

- CRUD操作
- ログ取得
- 統計

---

## 実行順序チェックリスト

- [ ] Step 1: 定数とスキーマ追加 + マイグレーション
- [ ] Step 2: AlertManager実装
- [ ] Step 3: 通知プロセッサー実装
- [ ] Step 4: テンプレート作成
- [ ] Step 5: APIエンドポイント作成
- [ ] Step 6: 既存プロセッサー統合
- [ ] Step 7: Worker起動設定
- [ ] Step 8: 環境変数設定
- [ ] Step 9: テスト作成
- [ ] ビルド確認: `npm run build`
- [ ] テスト実行: `npm test`
- [ ] コミット・プッシュ

---

## 注意事項

1. **Email設定**: Gmail使用時はアプリパスワードが必要
2. **Slack Webhook**: Slack Appを作成してWebhook URLを取得
3. **優先度**: notification-queueは低優先度で実行（メイン処理を阻害しない）
4. **Phase 27への準備**: LINE/Discord/WebSocket対応は設計に含めるが実装は次フェーズ

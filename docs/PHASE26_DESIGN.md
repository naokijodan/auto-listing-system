# RAKUDA Phase 26 設計書

## 概要
**テーマ: アクション誘導型アラートシステム（Smart Notification System）**

通知を送るだけでなく、「運用者がすぐに行動できる」通知システムを構築する。
通知疲れを防ぎつつ、重要イベントへの対応速度を最大化する。

## 3者協議の結論

### Claude
- リアルタイム通知・アラートシステムを提案
- WebSocket/SSE、Slack/Discord/LINE連携

### GPT-5
- 「運用インパクトの高い最小セット」から開始すべき
- WebSocket/SSEは後回し、まずはポーリング + BullMQ
- Email + Slackの2チャネルに絞る

### 最終合意
- **アクション誘導型通知 + 集約制御**を優先
- リアルタイム化はPhase 27以降
- 「役に立つ、うるさくない通知」を目指す

---

## 実装タスク

### Phase 26A: Notification Service層の構築

#### 1. AlertManagerクラス作成
**ファイル**: `apps/worker/src/lib/alert-manager.ts`

```typescript
interface AlertRule {
  id: string;
  name: string;
  eventType: AlertEventType;
  conditions: AlertCondition[];
  severity: 'critical' | 'warning' | 'info';
  channels: NotificationChannel[];
  cooldownMinutes: number;
  batchWindowMinutes: number;
}

type AlertEventType =
  | 'INVENTORY_OUT_OF_STOCK'
  | 'PRICE_DROP_DETECTED'
  | 'LISTING_FAILED'
  | 'COMPETITOR_PRICE_CHANGE'
  | 'ORDER_RECEIVED'
  | 'SCRAPE_ERROR';

class AlertManager {
  async processEvent(event: AlertEvent): Promise<void>;
  async checkRules(event: AlertEvent): Promise<AlertRule[]>;
  async shouldThrottle(ruleId: string): Promise<boolean>;
  async batchSimilarAlerts(alerts: Alert[]): Promise<BatchedAlert[]>;
}
```

#### 2. 通知キュー追加
**ファイル**: `packages/config/src/constants.ts`

```typescript
export const QUEUE_NAMES = {
  // 既存
  SCRAPE: 'scrape',
  IMAGE: 'image',
  TRANSLATE: 'translate',
  PUBLISH: 'publish',
  INVENTORY: 'inventory',
  // 新規追加
  NOTIFICATION: 'notification',
} as const;
```

#### 3. 通知プロセッサー
**ファイル**: `apps/worker/src/processors/notification.ts`

- Email送信（Nodemailer）
- Slack送信（Webhook）
- バッチ処理・スロットリング

---

### Phase 26B: 通知ルールエンジン

#### 1. Prismaスキーマ追加

```prisma
model AlertRule {
  id                String   @id @default(cuid())
  name              String
  eventType         String
  conditions        Json     // { field, operator, value }[]
  severity          String   // critical, warning, info
  channels          String[] // ['email', 'slack']
  cooldownMinutes   Int      @default(30)
  batchWindowMinutes Int     @default(5)
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("alert_rules")
}

model AlertLog {
  id          String   @id @default(cuid())
  ruleId      String?
  eventType   String
  severity    String
  title       String
  message     String
  metadata    Json?
  channels    String[]
  status      String   // pending, sent, failed, batched
  batchId     String?
  sentAt      DateTime?
  createdAt   DateTime @default(now())

  @@index([eventType, createdAt])
  @@index([batchId])
  @@map("alert_logs")
}
```

#### 2. 対象イベント（最小セット）

| イベント | 重要度 | デフォルトチャネル |
|---------|--------|-------------------|
| 在庫切れ | critical | email, slack |
| 価格急変（±20%以上） | warning | slack |
| 出品失敗 | critical | email, slack |
| 競合価格変動 | info | slack |
| 注文受付 | info | slack |

---

### Phase 26C: 通知テンプレートエンジン

#### 1. テンプレート管理
**ファイル**: `apps/worker/src/lib/notification-templates.ts`

```typescript
const templates = {
  INVENTORY_OUT_OF_STOCK: {
    email: {
      subject: '【RAKUDA】在庫切れアラート: {{count}}件',
      body: `...`
    },
    slack: {
      blocks: [...] // Slack Block Kit
    }
  },
  // ...
};
```

#### 2. Deep Link生成
```typescript
function generateDeepLink(type: string, params: Record<string, string>): string {
  const baseUrl = process.env.WEB_APP_URL || 'http://localhost:3001';

  const routes = {
    product: `${baseUrl}/products/{{id}}`,
    listing: `${baseUrl}/listings/{{id}}`,
    inventory: `${baseUrl}/inventory?filter={{filter}}`,
    pricing: `${baseUrl}/pricing/recommendations?id={{id}}`,
  };

  return interpolate(routes[type], params);
}
```

---

### Phase 26D: API エンドポイント

#### 1. アラートルール管理
```
GET    /api/alerts/rules           - ルール一覧
POST   /api/alerts/rules           - ルール作成
GET    /api/alerts/rules/:id       - ルール詳細
PUT    /api/alerts/rules/:id       - ルール更新
DELETE /api/alerts/rules/:id       - ルール削除
POST   /api/alerts/rules/:id/test  - ルールテスト
```

#### 2. アラートログ
```
GET    /api/alerts/logs            - ログ一覧（フィルター可）
GET    /api/alerts/logs/stats      - 統計（送信数、成功率など）
```

#### 3. 手動通知
```
POST   /api/alerts/send            - 手動通知送信
```

---

### Phase 26E: 可観測性

#### 1. メトリクス
- 通知送信数（チャネル別）
- 送信成功率
- 平均遅延時間
- バッチ化率
- スロットリング発生率

#### 2. Redisキー設計
```
rakuda:alert:throttle:{ruleId}    - クールダウン管理
rakuda:alert:batch:{eventType}    - バッチバッファ
rakuda:alert:stats:{date}         - 日次統計
```

---

## 実装順序

```
Phase 26A (1日目)
├── AlertManager基本クラス
├── notification-queue追加
└── notification-processor骨格

Phase 26B (2日目)
├── Prismaスキーマ追加
├── AlertRule CRUD API
└── 条件評価ロジック

Phase 26C (3日目)
├── テンプレートエンジン
├── Email送信実装
├── Slack Webhook実装
└── Deep Link生成

Phase 26D (4日目)
├── バッチ処理実装
├── スロットリング実装
└── 既存プロセッサーへの統合

Phase 26E (5日目)
├── メトリクス収集
├── 統計API
└── テスト・ドキュメント
```

---

## 技術的な注意点

1. **既存処理への影響を最小化**
   - notification-queueは低優先度で実行
   - メイン処理（scrape, publish）を阻害しない

2. **環境変数追加**
   ```env
   # Email (Nodemailer)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=
   SMTP_PASS=
   ALERT_EMAIL_FROM=noreply@rakuda.example.com

   # Slack
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

   # App URL (Deep Link用)
   WEB_APP_URL=http://localhost:3001
   ```

3. **Phase 27への拡張ポイント**
   - LINE/Discord連携
   - WebSocket/SSEリアルタイム更新
   - モバイルプッシュ通知

---

## 成功指標

- [ ] 重要イベントの通知が30秒以内に送信される
- [ ] 通知疲れを防ぐバッチ・スロットリングが機能
- [ ] Deep Linkから1クリックで対応画面に遷移できる
- [ ] 送信成功率 99%以上
- [ ] テストカバレッジ 80%以上

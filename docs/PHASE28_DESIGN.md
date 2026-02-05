# RAKUDA Phase 28 設計書

## 概要
**テーマ: ハイブリッド型収益最大化エンジン (Hybrid Profit Maximizer)**

ルールベース（競合追従/ROI維持）とAI（需要予測）を組み合わせた価格改定エンジン。運用者の心理的安全性を担保しつつ、利益率向上を実現する。

## 3者協議の結論

### Claude
- 既存の価格変動検知・競合追跡基盤を活用
- リアルタイム基盤で価格推奨をプッシュ
- 過去の販売データ分析による最適価格推奨

### GPT-5
- 段階的自動化（可視化→シミュレーション→限定自動適用）
- 推奨価格の根拠と説明性を担保
- 安全弁付きの収益最大化エンジン

### Gemini
- ルールベース＋AIのハイブリッド構成
- サーキットブレーカー、更新頻度制御（Throttling）
- 時系列データ基盤、バックテスト機能
- 「効率化ツール」から「利益創出ツール」への転換

### 最終合意
- **アプローチ**: ルールベース（主）＋AI補助（副）のハイブリッド
- **安全性**: サーキットブレーカー、レート制限、承認フロー
- **可視化**: 推奨根拠、シミュレーション、バックテスト
- **データ**: 価格履歴・販売実績の時系列DB化

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Price Optimizer Engine                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │ Rule Engine │    │ AI Advisor  │    │  Simulator  │             │
│  │ (主判断)    │◀──▶│ (需要予測)  │◀──▶│ (検証)      │             │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘             │
│         │                  │                  │                     │
│         ▼                  ▼                  ▼                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │               Price Recommendation                    │          │
│  │  (推奨価格 + 根拠 + 影響試算 + 承認ステータス)        │          │
│  └──────────────────────────────────────────────────────┘          │
├─────────────────────────────────────────────────────────────────────┤
│                        Safety Layers                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │ Circuit     │    │ Throttling  │    │ Approval    │             │
│  │ Breaker     │    │ Controller  │    │ Workflow    │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Price      │      │  Competitor │      │   Sales     │
│  History    │      │  Log        │      │   Data      │
│  (時系列)   │      │  (競合履歴) │      │  (販売実績) │
└─────────────┘      └─────────────┘      └─────────────┘
```

---

## 実装タスク

### Phase 28A: データ基盤構築（時系列データ）

#### 1. Prismaスキーマ追加

```prisma
// 価格履歴
model PriceHistory {
  id          String   @id @default(cuid())
  listingId   String
  listing     Listing  @relation(fields: [listingId], references: [id])
  price       Float
  currency    String   @default("USD")
  source      String   // 'manual' | 'rule' | 'ai' | 'competitor'
  recordedAt  DateTime @default(now())

  @@index([listingId, recordedAt])
}

// 競合価格ログ
model CompetitorPriceLog {
  id            String    @id @default(cuid())
  competitorId  String
  competitor    Competitor @relation(fields: [competitorId], references: [id])
  price         Float
  currency      String    @default("USD")
  recordedAt    DateTime  @default(now())

  @@index([competitorId, recordedAt])
}

// 価格推奨
model PriceRecommendation {
  id              String   @id @default(cuid())
  listingId       String
  listing         Listing  @relation(fields: [listingId], references: [id])
  currentPrice    Float
  recommendedPrice Float
  minPrice        Float?   // ルールによる下限
  maxPrice        Float?   // ルールによる上限
  confidence      Float    // 0-1 信頼度
  reason          String   // JSON: 推奨根拠
  impact          String   // JSON: 影響試算
  status          String   @default("PENDING") // PENDING | APPROVED | REJECTED | APPLIED | EXPIRED
  expiresAt       DateTime
  approvedAt      DateTime?
  appliedAt       DateTime?
  createdAt       DateTime @default(now())

  @@index([listingId, status])
  @@index([status, expiresAt])
}

// 価格ルール
model PricingRule {
  id            String   @id @default(cuid())
  name          String
  description   String?
  type          String   // 'COMPETITOR_FOLLOW' | 'MIN_MARGIN' | 'MAX_DISCOUNT' | 'DEMAND_BASED'
  conditions    String   // JSON: 適用条件
  actions       String   // JSON: アクション定義
  priority      Int      @default(0)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### 2. 価格履歴記録サービス

**ファイル**: `apps/worker/src/lib/price-history.ts`

```typescript
class PriceHistoryService {
  async recordPrice(listingId: string, price: number, source: string): Promise<void>;
  async getHistory(listingId: string, days: number): Promise<PriceHistory[]>;
  async getAveragePrice(listingId: string, days: number): Promise<number>;
  async getPriceVolatility(listingId: string, days: number): Promise<number>;
}
```

---

### Phase 28B: ルールエンジン実装

#### 1. ルールエンジンコア

**ファイル**: `apps/worker/src/lib/pricing/rule-engine.ts`

```typescript
interface PricingRule {
  type: 'COMPETITOR_FOLLOW' | 'MIN_MARGIN' | 'MAX_DISCOUNT' | 'DEMAND_BASED';
  conditions: RuleCondition[];
  actions: RuleAction[];
}

interface RuleCondition {
  field: string;      // 'competitorPrice' | 'margin' | 'daysListed' | 'salesVelocity'
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'between';
  value: number | [number, number];
}

interface RuleAction {
  type: 'SET_PRICE' | 'ADJUST_PERCENT' | 'ADJUST_AMOUNT' | 'MATCH_COMPETITOR';
  value?: number;
  constraints?: {
    minPrice?: number;
    maxPrice?: number;
    minMargin?: number;  // 最低利益率 (%)
  };
}

class PricingRuleEngine {
  async evaluate(listingId: string, context: PricingContext): Promise<PriceRecommendation>;
  async applyRules(listing: Listing, rules: PricingRule[]): Promise<number | null>;
  validateConstraints(price: number, constraints: RuleAction['constraints']): boolean;
}
```

#### 2. 標準ルールテンプレート

```typescript
// 競合追従ルール
const competitorFollowRule: PricingRule = {
  type: 'COMPETITOR_FOLLOW',
  conditions: [
    { field: 'competitorPrice', operator: 'lt', value: 'currentPrice' }
  ],
  actions: [
    {
      type: 'MATCH_COMPETITOR',
      value: -500, // 競合より500円安く
      constraints: { minMargin: 15 } // 利益率15%は死守
    }
  ]
};

// 滞留商品値下げルール
const staleItemRule: PricingRule = {
  type: 'DEMAND_BASED',
  conditions: [
    { field: 'daysListed', operator: 'gt', value: 30 },
    { field: 'salesVelocity', operator: 'lt', value: 0.1 }
  ],
  actions: [
    {
      type: 'ADJUST_PERCENT',
      value: -5, // 5%値下げ
      constraints: { minMargin: 10, maxDiscount: 30 }
    }
  ]
};
```

---

### Phase 28C: 安全装置（Safety Layers）

#### 1. サーキットブレーカー

**ファイル**: `apps/worker/src/lib/pricing/circuit-breaker.ts`

```typescript
interface CircuitBreakerConfig {
  maxPriceDropPercent: number;  // 1回の最大値下げ率 (デフォルト: 20%)
  minPriceFloor: number;        // 絶対最低価格
  dailyChangeLimit: number;     // 1日の最大変更回数
  cooldownMinutes: number;      // 連続変更の冷却期間
}

class PricingCircuitBreaker {
  async canApply(listingId: string, newPrice: number): Promise<{
    allowed: boolean;
    reason?: string;
    suggestedPrice?: number;
  }>;

  async recordChange(listingId: string, oldPrice: number, newPrice: number): Promise<void>;
  async getDailyChangeCount(listingId: string): Promise<number>;
}
```

#### 2. スロットリングコントローラー

**ファイル**: `apps/worker/src/lib/pricing/throttling.ts`

```typescript
interface ThrottlingConfig {
  maxUpdatesPerMinute: number;     // プラットフォームAPI制限
  batchSize: number;               // バッチ更新サイズ
  priorityStrategy: 'fifo' | 'impact' | 'urgency';
}

class PricingThrottler {
  async enqueue(recommendation: PriceRecommendation): Promise<void>;
  async processQueue(): Promise<void>;
  async getQueueStatus(): Promise<{ pending: number; processing: number }>;
}
```

#### 3. 承認ワークフロー

**ファイル**: `apps/worker/src/lib/pricing/approval-workflow.ts`

```typescript
interface ApprovalConfig {
  autoApproveThreshold: number;    // 自動承認の閾値（変動率%）
  requireApprovalAbove: number;    // 承認必須の閾値（金額）
  expirationHours: number;         // 推奨の有効期限
}

class ApprovalWorkflow {
  async createRecommendation(data: CreateRecommendationInput): Promise<PriceRecommendation>;
  async approve(recommendationId: string, userId?: string): Promise<void>;
  async reject(recommendationId: string, reason: string): Promise<void>;
  async autoProcess(): Promise<{ approved: number; expired: number }>;
}
```

---

### Phase 28D: シミュレーション・バックテスト

#### 1. シミュレーター

**ファイル**: `apps/worker/src/lib/pricing/simulator.ts`

```typescript
interface SimulationInput {
  listingIds: string[];
  rules: PricingRule[];
  startDate: Date;
  endDate: Date;
}

interface SimulationResult {
  period: { start: Date; end: Date };
  listings: SimulationListingResult[];
  summary: {
    totalRevenueBefore: number;
    totalRevenueAfter: number;
    revenueChange: number;
    revenueChangePercent: number;
    totalProfitBefore: number;
    totalProfitAfter: number;
    profitChange: number;
    profitChangePercent: number;
    priceChanges: number;
    avgPriceChange: number;
  };
}

class PricingSimulator {
  async runBacktest(input: SimulationInput): Promise<SimulationResult>;
  async runForecast(listingId: string, rules: PricingRule[]): Promise<ForecastResult>;
}
```

#### 2. 影響試算

```typescript
interface ImpactEstimate {
  revenueImpact: number;
  profitImpact: number;
  marginChange: number;
  expectedSalesChange: number;  // 需要弾力性に基づく
  competitorPosition: 'cheapest' | 'mid' | 'premium';
  riskLevel: 'low' | 'medium' | 'high';
}
```

---

### Phase 28E: API・UI実装

#### 1. APIエンドポイント

**ファイル**: `apps/api/src/routes/pricing-optimizer.ts`

```
GET    /api/pricing/recommendations           - 推奨一覧
GET    /api/pricing/recommendations/:id       - 推奨詳細
POST   /api/pricing/recommendations/:id/approve - 承認
POST   /api/pricing/recommendations/:id/reject  - 却下
POST   /api/pricing/recommendations/bulk-approve - 一括承認

GET    /api/pricing/rules                     - ルール一覧
POST   /api/pricing/rules                     - ルール作成
PUT    /api/pricing/rules/:id                 - ルール更新
DELETE /api/pricing/rules/:id                 - ルール削除

POST   /api/pricing/simulate                  - シミュレーション実行
POST   /api/pricing/backtest                  - バックテスト実行

GET    /api/pricing/history/:listingId        - 価格履歴
GET    /api/pricing/stats                     - 最適化統計
```

#### 2. UIコンポーネント

- **価格推奨ダッシュボード**: 推奨一覧、承認/却下、根拠表示
- **ルールビルダー**: ルール作成・編集UI
- **シミュレーションビュー**: バックテスト結果チャート
- **価格履歴チャート**: 時系列価格グラフ（競合比較付き）

---

## 実装順序

```
Phase 28A (1日目)
├── Prismaスキーマ追加（PriceHistory, CompetitorPriceLog, PriceRecommendation, PricingRule）
├── マイグレーション実行
└── 価格履歴記録サービス

Phase 28B (2日目)
├── ルールエンジンコア
├── 標準ルールテンプレート
└── ルール評価ロジック

Phase 28C (3日目)
├── サーキットブレーカー
├── スロットリングコントローラー
└── 承認ワークフロー

Phase 28D (4日目)
├── シミュレーター
├── バックテスト機能
└── 影響試算ロジック

Phase 28E (5日目)
├── APIエンドポイント
├── フロントエンドUI
└── リアルタイム連携（Phase 27）
```

---

## 環境変数追加

```env
# Pricing Optimizer (Phase 28)
PRICING_AUTO_APPROVE_THRESHOLD=5      # 5%以下の変動は自動承認
PRICING_MIN_MARGIN_PERCENT=10         # 最低利益率10%
PRICING_MAX_DROP_PERCENT=20           # 1回の最大値下げ20%
PRICING_DAILY_CHANGE_LIMIT=3          # 1日最大3回の価格変更
PRICING_COOLDOWN_MINUTES=60           # 変更後60分のクールダウン
PRICING_RECOMMENDATION_EXPIRY_HOURS=24 # 推奨の有効期限24時間
```

---

## 成功指標

- [ ] ルールベース価格推奨が機能する
- [ ] サーキットブレーカーで異常な価格変更を防止
- [ ] シミュレーションで過去データの検証が可能
- [ ] 推奨根拠が明確に表示される
- [ ] 承認フローで安全に価格を適用
- [ ] リアルタイムダッシュボードと連携

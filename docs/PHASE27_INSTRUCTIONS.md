# RAKUDA Phase 27 実装指示書

## 前提条件
- Phase 26が完了していること
- PostgreSQL、Redis、Node.js環境が稼働中

---

## Step 1: EventBus基盤構築

### 1.1 イベント型定義
**ファイル**: `packages/schema/src/realtime.ts`

```typescript
export type RealTimeEventType =
  | 'INVENTORY_CHANGE'
  | 'ORDER_RECEIVED'
  | 'PRICE_CHANGE'
  | 'LISTING_UPDATE';

export interface RealTimeEvent {
  type: RealTimeEventType;
  payload: {
    id: string;
    action: 'created' | 'updated' | 'deleted';
    data?: Record<string, unknown>;
  };
  timestamp: string;
}
```

### 1.2 EventBusクラス作成
**ファイル**: `apps/worker/src/lib/event-bus.ts`

実装内容:
- Redis Pub/Sub接続
- `publish(channel, event)` - イベント発行
- `subscribe(channel, handler)` - イベント購読
- チャネル定義（INVENTORY, ORDERS, PRICING, LISTINGS）

### 1.3 定数追加
**ファイル**: `packages/config/src/constants.ts`

```typescript
export const EVENT_CHANNELS = {
  INVENTORY: 'rakuda:realtime:inventory',
  ORDERS: 'rakuda:realtime:orders',
  PRICING: 'rakuda:realtime:pricing',
  LISTINGS: 'rakuda:realtime:listings',
} as const;
```

---

## Step 2: SSEエンドポイント実装

### 2.1 リアルタイムルーター作成
**ファイル**: `apps/api/src/routes/realtime.ts`

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /api/realtime/events | SSEストリーム |
| GET | /api/realtime/status | 接続ステータス |
| GET | /api/realtime/stats | 配信統計 |

### 2.2 SSE接続管理
- ハートビート送信（30秒間隔）
- 接続数トラッキング
- クリーンアップ処理

### 2.3 イベントデバウンス
- 500ms以内の同一タイプイベントをグルーピング
- バッチ処理時のイベント爆発防止

### 2.4 index.tsにルート追加
```typescript
import { realtimeRouter } from './routes/realtime';
app.use('/api/realtime', realtimeRouter);
```

---

## Step 3: Workerイベント発火統合

### 3.1 EventBus初期化
**ファイル**: `apps/worker/src/lib/worker-manager.ts`

```typescript
import { eventBus } from './event-bus';

// startWorkers内で初期化
await eventBus.initialize();
```

### 3.2 inventory-checker.ts統合
在庫変動時にイベント発火:
```typescript
await eventBus.publish(EVENT_CHANNELS.INVENTORY, {
  type: 'INVENTORY_CHANGE',
  payload: { id: productId, action: 'updated', data: { isAvailable } },
  timestamp: new Date().toISOString(),
});
```

### 3.3 publish.ts統合
出品更新時にイベント発火

### 3.4 webhooks.ts統合
新規注文時にイベント発火:
```typescript
await eventBus.publish(EVENT_CHANNELS.ORDERS, {
  type: 'ORDER_RECEIVED',
  payload: { id: orderId, action: 'created', data: { marketplace, total } },
  timestamp: new Date().toISOString(),
});
```

### 3.5 price-sync.ts統合
価格変動時にイベント発火

---

## Step 4: フロントエンド実装

### 4.1 useRealtimeEventsフック作成
**ファイル**: `apps/web/src/hooks/useRealtimeEvents.ts`

- EventSource接続管理
- 接続状態（isConnected）
- 最新イベント（lastEvent）
- 自動再接続

### 4.2 TanStack Query連携
**ファイル**: `apps/web/src/providers/RealtimeProvider.tsx`

イベント受信時にキャッシュ無効化:
- INVENTORY_CHANGE → products, inventory クエリ
- ORDER_RECEIVED → orders クエリ
- PRICE_CHANGE → listings, pricing クエリ

### 4.3 接続ステータスコンポーネント
**ファイル**: `apps/web/src/components/ConnectionStatus.tsx`

- 緑/赤のドットインジケーター
- ツールチップで接続状態表示
- ヘッダーに配置

### 4.4 トースト通知コンポーネント
**ファイル**: `apps/web/src/components/RealtimeToast.tsx`

- イベント受信時にトースト表示
- 5秒後に自動消去
- クリックで詳細画面へ遷移

### 4.5 layout.tsx更新
RealtimeProviderとコンポーネントを追加

---

## Step 5: 統合テスト

### 5.1 EventBusテスト
**ファイル**: `apps/worker/src/test/unit/event-bus.test.ts`

- Pub/Sub動作確認
- チャネル分離確認
- エラーハンドリング

### 5.2 SSEエンドポイントテスト
**ファイル**: `apps/api/src/test/integration/realtime.test.ts`

- SSE接続確立
- イベント受信
- 再接続動作

---

## Step 6: 環境変数設定

### 6.1 .env.example更新
```env
# Realtime Settings (Phase 27)
SSE_HEARTBEAT_INTERVAL=30000
SSE_DEBOUNCE_WINDOW=500
REALTIME_ENABLED=true
```

---

## 実行順序チェックリスト

- [ ] Step 1: EventBus基盤構築
  - [ ] 型定義追加
  - [ ] EventBusクラス作成
  - [ ] 定数追加
- [ ] Step 2: SSEエンドポイント実装
  - [ ] realtime.ts作成
  - [ ] デバウンス実装
  - [ ] index.tsにルート追加
- [ ] Step 3: Workerイベント発火統合
  - [ ] EventBus初期化
  - [ ] inventory-checker統合
  - [ ] webhooks統合
  - [ ] price-sync統合
- [ ] Step 4: フロントエンド実装
  - [ ] useRealtimeEventsフック
  - [ ] RealtimeProvider
  - [ ] ConnectionStatus
  - [ ] RealtimeToast
  - [ ] layout.tsx更新
- [ ] Step 5: 統合テスト
- [ ] Step 6: 環境変数設定
- [ ] ビルド確認: `npm run build`
- [ ] コミット・プッシュ

---

## 注意事項

1. **SSE認証**: 既存のapiKeyAuth ミドルウェアを適用
2. **ハートビート**: 接続維持のため30秒間隔でping送信
3. **デバウンス**: バッチ処理時のイベント爆発を防止
4. **Phase 28への準備**: EventBusのサブスクライバー追加でLINE/Discord連携可能

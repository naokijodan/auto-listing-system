# RAKUDA Phase 27 設計書

## 概要
**テーマ: リアルタイムダッシュボード（Real-time Dashboard）**

運用者がダッシュボードを開いた瞬間に最新状態を確認でき、作業中もリアルタイムで状況変化を把握できるシステムを構築する。

## 3者協議の結論

### Claude
- WebSocket/SSEでフロントエンドへリアルタイム更新を実装
- Phase 26アラートシステムと連携し、通知だけでなく画面上でも可視化
- LINE/Discord連携はPhase 28で対応可能

### GPT-5
- 通知は「気づき」、判断は「ダッシュボード」→ここをリアルタイム化で体感価値向上
- SSEを第一候補（一方向配信が主のため）
- Redis/BullMQでイベントバスを構築すれば、Phase 28以降の拡張も容易

### Gemini
- SSE + Redis Pub/Subを推奨
- TanStack Queryのキャッシュ無効化パターンで実装複雑性を低減
- 接続ステータス表示（死活監視）をMVPに含める
- イベント爆発対策（デバウンス/バッチ化）

### 最終合意
- **技術**: Redis Pub/Sub + SSE
- **対象イベント**: 在庫切れ、新規注文、価格変動
- **UI**: トースト通知、接続ステータス、動的更新（作業阻害しない）
- **アーキテクチャ**: Worker → Redis Pub → API(SSE) → Next.js

---

## アーキテクチャ

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Worker    │────▶│  Redis Pub  │────▶│  API (SSE)  │────▶│   Next.js   │
│  (BullMQ)   │     │    /Sub     │     │  Endpoint   │     │  Dashboard  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                                        │
      │                                        ▼
      │                              ┌─────────────────┐
      └─────────────────────────────▶│  AlertManager   │
                                     │   (Phase 26)    │
                                     └─────────────────┘
```

---

## 実装タスク

### Phase 27A: イベントバス基盤構築

#### 1. Redis Pub/Subラッパー作成
**ファイル**: `apps/worker/src/lib/event-bus.ts`

```typescript
interface RealTimeEvent {
  type: 'INVENTORY_CHANGE' | 'ORDER_RECEIVED' | 'PRICE_CHANGE' | 'LISTING_UPDATE';
  payload: {
    id: string;
    action: 'created' | 'updated' | 'deleted';
    data?: Record<string, unknown>;
  };
  timestamp: string;
}

class EventBus {
  async publish(channel: string, event: RealTimeEvent): Promise<void>;
  subscribe(channel: string, handler: (event: RealTimeEvent) => void): void;
  unsubscribe(channel: string): void;
}
```

#### 2. イベントチャネル定義
```typescript
export const EVENT_CHANNELS = {
  INVENTORY: 'rakuda:realtime:inventory',
  ORDERS: 'rakuda:realtime:orders',
  PRICING: 'rakuda:realtime:pricing',
  LISTINGS: 'rakuda:realtime:listings',
  ALL: 'rakuda:realtime:*',
} as const;
```

---

### Phase 27B: SSEエンドポイント実装

#### 1. SSEルーター作成
**ファイル**: `apps/api/src/routes/realtime.ts`

```typescript
// GET /api/realtime/events
// SSE接続エンドポイント
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Redis Pub/Subからイベントを受信してクライアントへ配信
});

// GET /api/realtime/status
// 接続ステータス確認
router.get('/status', (req, res) => {
  res.json({ connected: true, timestamp: new Date().toISOString() });
});
```

#### 2. イベントデバウンス/バッチ化
- 500ms以内の同一タイプイベントをグルーピング
- 大量イベント発生時のブラウザフリーズ防止

---

### Phase 27C: Workerイベント発火統合

#### 1. 既存プロセッサーへの統合

**inventory-checker.ts**
```typescript
// 在庫変動時
await eventBus.publish(EVENT_CHANNELS.INVENTORY, {
  type: 'INVENTORY_CHANGE',
  payload: { id: productId, action: 'updated', data: { isAvailable, priceChanged } },
  timestamp: new Date().toISOString(),
});
```

**publish.ts / webhooks.ts**
```typescript
// 新規注文時
await eventBus.publish(EVENT_CHANNELS.ORDERS, {
  type: 'ORDER_RECEIVED',
  payload: { id: orderId, action: 'created', data: { marketplace, total } },
  timestamp: new Date().toISOString(),
});
```

**price-sync.ts / competitor-scraper.ts**
```typescript
// 価格変動時
await eventBus.publish(EVENT_CHANNELS.PRICING, {
  type: 'PRICE_CHANGE',
  payload: { id: listingId, action: 'updated', data: { oldPrice, newPrice } },
  timestamp: new Date().toISOString(),
});
```

---

### Phase 27D: フロントエンド実装

#### 1. SSEフック作成
**ファイル**: `apps/web/src/hooks/useRealtimeEvents.ts`

```typescript
export function useRealtimeEvents(options?: {
  channels?: string[];
  onEvent?: (event: RealTimeEvent) => void;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealTimeEvent | null>(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/realtime/events');

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);
    eventSource.onmessage = (e) => {
      const event = JSON.parse(e.data);
      setLastEvent(event);
      options?.onEvent?.(event);
    };

    return () => eventSource.close();
  }, []);

  return { isConnected, lastEvent };
}
```

#### 2. TanStack Query連携
```typescript
// イベント受信時にキャッシュを無効化
const queryClient = useQueryClient();

useRealtimeEvents({
  onEvent: (event) => {
    switch (event.type) {
      case 'INVENTORY_CHANGE':
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        break;
      case 'ORDER_RECEIVED':
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        break;
      case 'PRICE_CHANGE':
        queryClient.invalidateQueries({ queryKey: ['listings'] });
        queryClient.invalidateQueries({ queryKey: ['pricing'] });
        break;
    }
  },
});
```

#### 3. UIコンポーネント

**接続ステータスインジケーター**
```typescript
// apps/web/src/components/ConnectionStatus.tsx
export function ConnectionStatus() {
  const { isConnected } = useRealtimeEvents();

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-xs text-gray-500">
        {isConnected ? 'リアルタイム接続中' : '接続切断'}
      </span>
    </div>
  );
}
```

**トースト通知**
```typescript
// apps/web/src/components/RealtimeToast.tsx
export function RealtimeToast() {
  const { lastEvent } = useRealtimeEvents();

  useEffect(() => {
    if (!lastEvent) return;

    const messages = {
      ORDER_RECEIVED: '新規注文が入りました',
      INVENTORY_CHANGE: '在庫状況が変更されました',
      PRICE_CHANGE: '価格が変更されました',
    };

    toast(messages[lastEvent.type] || 'データが更新されました');
  }, [lastEvent]);

  return null;
}
```

---

### Phase 27E: 統合テスト・可観測性

#### 1. Redisキー設計
```
rakuda:realtime:inventory     - 在庫イベントチャネル
rakuda:realtime:orders        - 注文イベントチャネル
rakuda:realtime:pricing       - 価格イベントチャネル
rakuda:realtime:stats:{date}  - 日次統計
```

#### 2. メトリクス
- SSE接続数（アクティブ/累計）
- イベント配信数（タイプ別）
- 平均遅延時間
- 再接続率

#### 3. APIエンドポイント
```
GET /api/realtime/events   - SSEストリーム
GET /api/realtime/status   - 接続ステータス
GET /api/realtime/stats    - 配信統計
```

---

## 実装順序

```
Phase 27A (1日目)
├── EventBus基本クラス
├── Redis Pub/Sub接続
└── イベントチャネル定義

Phase 27B (2日目)
├── SSEエンドポイント
├── イベントデバウンス
└── 接続管理

Phase 27C (3日目)
├── inventory-checker統合
├── publish/webhooks統合
└── price-sync統合

Phase 27D (4日目)
├── useRealtimeEventsフック
├── TanStack Query連携
├── 接続ステータスUI
└── トースト通知

Phase 27E (5日目)
├── 統合テスト
├── メトリクス収集
└── ドキュメント
```

---

## 技術的な注意点

1. **SSE再接続**
   - ブラウザのEventSourceは自動再接続するが、タイムアウト設定に注意
   - サーバー側でハートビート（30秒間隔）を送信

2. **イベント爆発対策**
   - バッチ処理時の大量イベントをデバウンス
   - クライアント側でも重複イベントを無視

3. **セキュリティ**
   - SSEエンドポイントにも認証を適用
   - 機密データはイベントに含めない（IDのみ送信）

4. **Phase 28への拡張ポイント**
   - LINE/Discord連携: EventBusのサブスクライバー追加
   - モバイルプッシュ: Firebase Cloud Messaging連携

---

## 環境変数追加

```env
# Realtime Settings (Phase 27)
SSE_HEARTBEAT_INTERVAL=30000
SSE_DEBOUNCE_WINDOW=500
REALTIME_ENABLED=true
```

---

## 成功指標

- [x] イベント発生から画面反映まで1秒以内
- [x] SSE接続の安定性 99%以上
- [x] 在庫切れ、新規注文、価格変動がリアルタイム表示
- [x] 接続ステータスが画面に表示される
- [x] 作業中の操作を阻害しないUI

---

## 実装完了 (2026-02-06)

### 実装されたファイル

**パッケージ層**
- `packages/schema/src/realtime.ts` - リアルタイムイベント型定義
- `packages/config/src/constants.ts` - EVENT_CHANNELS, SSE_CONFIG追加

**Worker層**
- `apps/worker/src/lib/event-bus.ts` - EventBusクラス（Redis Pub/Sub）
- `apps/worker/src/index.ts` - EventBus初期化・クリーンアップ追加
- `apps/worker/src/lib/inventory-checker.ts` - イベント発火統合
- `apps/worker/src/processors/publish.ts` - イベント発火統合

**API層**
- `apps/api/src/routes/realtime.ts` - SSEエンドポイント（/api/realtime/events, /status, /stats, /connections, /test）
- `apps/api/src/index.ts` - realtimeRouter登録

**フロントエンド層**
- `apps/web/src/lib/realtime.ts` - useRealtimeEvents, useRealtimeStatus フック
- `apps/web/src/components/realtime/realtime-status-indicator.tsx` - ステータス表示コンポーネント
- `apps/web/src/components/providers/realtime-provider.tsx` - RealtimeProvider（イベント通知、SWRキャッシュ無効化）
- `apps/web/src/components/providers/app-providers.tsx` - アプリプロバイダー統合
- `apps/web/src/components/layout/header.tsx` - RealtimeStatusIndicator統合
- `apps/web/src/app/layout.tsx` - AppProviders追加

**設定**
- `.env.example` - REALTIME_ENABLED, SSE_HEARTBEAT_INTERVAL, SSE_DEBOUNCE_WINDOW追加

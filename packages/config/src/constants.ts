/**
 * アプリケーション定数
 */

// ソースタイプ
export const SOURCE_TYPES = [
  'mercari',
  'yahoo_auction',
  'yahoo_flea',
  'rakuma',
  'rakuten',
  'amazon',
  'takayama',
  'joshin',
  'other',
] as const;

// マーケットプレイス
export const MARKETPLACES = ['joom', 'ebay'] as const;

// 商品ステータス
export const PRODUCT_STATUSES = [
  'pending_scrape',
  'processing_image',
  'translating',
  'ready_to_review',
  'approved',
  'publishing',
  'active',
  'sold',
  'out_of_stock',
  'error',
  'deleted',
] as const;

// 処理ステータス
export const PROCESS_STATUSES = [
  'pending',
  'processing',
  'completed',
  'error',
] as const;

// 出品ステータス
export const LISTING_STATUSES = [
  'draft',
  'pending_publish',
  'publishing',
  'active',
  'paused',
  'sold',
  'ended',
  'error',
] as const;

// ジョブステータス
export const JOB_STATUSES = [
  'queued',
  'processing',
  'completed',
  'failed',
  'dead_letter',
] as const;

// キュー名
export const QUEUE_NAMES = {
  SCRAPE: 'scrape-queue',
  IMAGE: 'image-queue',
  TRANSLATE: 'translate-queue',
  PUBLISH: 'publish-queue',
  INVENTORY: 'inventory-queue',
  NOTIFICATION: 'notification-queue',
  PRICING: 'pricing-queue',
  COMPETITOR: 'competitor-queue',
  DEAD_LETTER: 'dead-letter-queue',
  // Phase 41: エンリッチメント・Joom出品
  ENRICHMENT: 'enrichment-queue',
  JOOM_PUBLISH: 'joom-publish-queue',
  // Phase 51-52: 注文・発送処理
  ORDER: 'order-queue',
  SHIPMENT: 'shipment-queue',
  // Phase 103: eBay出品
  EBAY_PUBLISH: 'ebay-publish-queue',
  // v3.0: Etsy出品・Shopify同期
  ETSY_PUBLISH: 'etsy-publish-queue',
  SHOPIFY_SYNC: 'shopify-sync-queue',
} as const;

// キュー設定
export const QUEUE_CONFIG = {
  [QUEUE_NAMES.SCRAPE]: {
    priority: 5,
    rateLimit: { max: 10, duration: 60000 }, // 10件/分
    concurrency: 2,
    attempts: 5,
    backoff: { type: 'exponential', delay: 30000 },
  },
  [QUEUE_NAMES.IMAGE]: {
    priority: 4,
    concurrency: 3,
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
  },
  [QUEUE_NAMES.TRANSLATE]: {
    priority: 3,
    rateLimit: { max: 20, duration: 60000 }, // 20件/分
    concurrency: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
  [QUEUE_NAMES.PUBLISH]: {
    priority: 1,
    rateLimit: { max: 5, duration: 60000 }, // 5件/分
    concurrency: 2,
    attempts: 3,
    backoff: { type: 'exponential', delay: 60000 },
  },
  [QUEUE_NAMES.INVENTORY]: {
    priority: 2,
    rateLimit: { max: 10, duration: 60000 }, // 10件/分
    concurrency: 3,
    attempts: 5,
    backoff: { type: 'exponential', delay: 30000 },
  },
  [QUEUE_NAMES.NOTIFICATION]: {
    priority: 6, // 低優先度（メイン処理を阻害しない）
    rateLimit: { max: 30, duration: 60000 }, // 30件/分
    concurrency: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
  [QUEUE_NAMES.PRICING]: {
    priority: 3,
    rateLimit: { max: 20, duration: 60000 }, // 20件/分
    concurrency: 3,
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
  },
  [QUEUE_NAMES.COMPETITOR]: {
    priority: 4,
    rateLimit: { max: 10, duration: 60000 }, // 10件/分（スクレイピング負荷考慮）
    concurrency: 2,
    attempts: 3,
    backoff: { type: 'exponential', delay: 30000 },
  },
  // Phase 41: エンリッチメントキュー
  [QUEUE_NAMES.ENRICHMENT]: {
    priority: 2,
    rateLimit: { max: 20, duration: 60000 }, // 20件/分（OpenAI APIレート制限考慮）
    concurrency: 5,
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
  },
  // Phase 41: Joom出品キュー
  [QUEUE_NAMES.JOOM_PUBLISH]: {
    priority: 1,
    rateLimit: { max: 10, duration: 60000 }, // 10件/分（Joom APIレート制限考慮）
    concurrency: 3,
    attempts: 3,
    backoff: { type: 'exponential', delay: 30000 },
  },
  // Phase 51: 注文処理キュー
  [QUEUE_NAMES.ORDER]: {
    priority: 1, // 高優先度（注文は即時処理）
    rateLimit: { max: 30, duration: 60000 }, // 30件/分
    concurrency: 5,
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
  },
  // Phase 52: 発送処理キュー
  [QUEUE_NAMES.SHIPMENT]: {
    priority: 1, // 高優先度
    rateLimit: { max: 20, duration: 60000 }, // 20件/分
    concurrency: 3,
    attempts: 5,
    backoff: { type: 'exponential', delay: 10000 },
  },
  // Phase 103: eBay出品キュー
  [QUEUE_NAMES.EBAY_PUBLISH]: {
    priority: 1,
    rateLimit: { max: 5, duration: 60000 }, // 5件/分（eBay APIレート制限考慮）
    concurrency: 2,
    attempts: 3,
    backoff: { type: 'exponential', delay: 60000 },
  },
  // v3.0: Etsy出品キュー
  [QUEUE_NAMES.ETSY_PUBLISH]: {
    priority: 1,
    rateLimit: { max: 10, duration: 60000 }, // 10件/分（Etsy APIレート制限: 10req/sec）
    concurrency: 3,
    attempts: 3,
    backoff: { type: 'exponential', delay: 30000 },
  },
  // v3.0: Shopify同期キュー
  [QUEUE_NAMES.SHOPIFY_SYNC]: {
    priority: 1,
    rateLimit: { max: 20, duration: 60000 }, // 20件/分
    concurrency: 3,
    attempts: 3,
    backoff: { type: 'exponential', delay: 15000 },
  },
} as const;

// 在庫監視スケジュール（UTC）
export const INVENTORY_SCHEDULE = {
  times: ['01:00', '06:00', '12:00'], // UTC (JST 10:00, 15:00, 21:00)
  jitterMinutes: 30, // ±30分のランダムジッター
} as const;

// 価格計算デフォルト値
export const PRICE_DEFAULTS = {
  JOOM: {
    platformFeeRate: 0.15,       // 15%
    paymentFeeRate: 0.03,        // 3%
    targetProfitRate: 0.30,      // 30%
    adRate: 0,
    exchangeBuffer: 0.02,        // 2% 為替バッファ
    // Joomは関税なし
    dutyRate: 0,
    vatRate: 0,
    dutyProcessingFeeRate: 0,
    mpfAmount: 0,
    customsClearanceFeeJpy: 0,
    euShippingDiffJpy: 0,
  },
  EBAY: {
    platformFeeRate: 0.13,       // 13%
    paymentFeeRate: 0.03,        // 3%
    targetProfitRate: 0.30,      // 30%
    adRate: 0,
    exchangeBuffer: 0.02,        // 2% 為替バッファ
    // eBay固有: 関税・VAT・手数料パラメータ
    dutyRate: 0.15,              // 15% 関税率
    vatRate: 0,                  // VAT率（国別、デフォルト0）
    dutyProcessingFeeRate: 0.021, // 2.1% 関税処理手数料率
    mpfAmount: 0,                // MPF額（USD）
    customsClearanceFeeJpy: 0,   // CE通関手数料（円）
    euShippingDiffJpy: 0,        // EU送料差額（円）
  },
} as const;

// 送料デフォルト値
export const SHIPPING_DEFAULTS = {
  JOOM: {
    baseCost: 5,                 // USD ベース送料
    perGramCost: 0.01,           // USD/g
  },
  EBAY: {
    defaultCost: 12,             // USD デフォルト送料
  },
} as const;

// 為替レートデフォルト値
export const EXCHANGE_RATE_DEFAULTS = {
  JPY_TO_USD: 0.0067,            // 1 JPY = 0.0067 USD (約150円/ドル)
} as const;

// マーケットプレイス価格制限
export const MARKETPLACE_PRICE_LIMITS = {
  JOOM_PRICE_LIMIT_JPY: 900000,  // Joom出品上限（≒$6,000）、これ以上はeBay専用
} as const;

// 画像処理設定
export const IMAGE_CONFIG = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 85,
  format: 'jpeg',
  removeBackground: true,
} as const;

// リアルタイムイベントチャネル（Phase 27）
export const EVENT_CHANNELS = {
  INVENTORY: 'rakuda:realtime:inventory',
  ORDERS: 'rakuda:realtime:orders',
  PRICING: 'rakuda:realtime:pricing',
  LISTINGS: 'rakuda:realtime:listings',
  ALL: 'rakuda:realtime:*',
} as const;

// SSE設定（Phase 27）
export const SSE_CONFIG = {
  heartbeatInterval: parseInt(process.env.SSE_HEARTBEAT_INTERVAL || '30000', 10),
  debounceWindow: parseInt(process.env.SSE_DEBOUNCE_WINDOW || '500', 10),
  enabled: process.env.REALTIME_ENABLED !== 'false',
} as const;

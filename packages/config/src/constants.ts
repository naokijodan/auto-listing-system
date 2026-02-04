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
  DEAD_LETTER: 'dead-letter-queue',
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
} as const;

// 在庫監視スケジュール（UTC）
export const INVENTORY_SCHEDULE = {
  times: ['01:00', '06:00', '12:00'], // UTC (JST 10:00, 15:00, 21:00)
  jitterMinutes: 30, // ±30分のランダムジッター
} as const;

// 価格計算デフォルト値
export const PRICE_DEFAULTS = {
  JOOM: {
    platformFeeRate: 0.15,
    paymentFeeRate: 0.03,
    targetProfitRate: 0.20,
    adRate: 0,
  },
  EBAY: {
    platformFeeRate: 0.1325, // 13.25%
    paymentFeeRate: 0.029 + 0.30, // 2.9% + $0.30
    targetProfitRate: 0.20,
    adRate: 0,
  },
} as const;

// 画像処理設定
export const IMAGE_CONFIG = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 85,
  format: 'jpeg',
  removeBackground: true,
} as const;

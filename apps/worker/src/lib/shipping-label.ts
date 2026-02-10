import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'shipping-label' });

// 配送業者
export type ShippingCarrier = 'JAPAN_POST' | 'DHL' | 'FEDEX' | 'UPS' | 'EMS';

// ラベルフォーマット
export type LabelFormat = 'PDF' | 'PNG' | 'ZPL';

// 配送ラベルデータ
export interface ShippingLabel {
  id: string;
  orderId: string;
  carrier: ShippingCarrier;
  trackingNumber: string;
  labelUrl: string;
  format: LabelFormat;
  weight: number; // グラム
  dimensions?: { length: number; width: number; height: number }; // cm
  shippingCost: number; // 円
  createdAt: Date;
}

// 配送先情報
interface ShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

// 発送元情報（日本）
const SENDER_ADDRESS: ShippingAddress = {
  name: process.env.SENDER_NAME || 'RAKUDA Store',
  street1: process.env.SENDER_ADDRESS1 || '1-1-1 Shibuya',
  street2: process.env.SENDER_ADDRESS2,
  city: process.env.SENDER_CITY || 'Shibuya-ku',
  state: 'Tokyo',
  postalCode: process.env.SENDER_POSTAL_CODE || '150-0001',
  country: 'JP',
  phone: process.env.SENDER_PHONE,
};

// 配送料金表（概算）
const SHIPPING_RATES: Record<ShippingCarrier, { baseRate: number; perGram: number }> = {
  JAPAN_POST: { baseRate: 900, perGram: 0.5 },
  EMS: { baseRate: 2000, perGram: 1.0 },
  DHL: { baseRate: 3000, perGram: 1.5 },
  FEDEX: { baseRate: 3500, perGram: 1.5 },
  UPS: { baseRate: 3200, perGram: 1.4 },
};

// 国別推奨配送業者
const COUNTRY_CARRIER_MAP: Record<string, ShippingCarrier> = {
  US: 'JAPAN_POST',
  CA: 'JAPAN_POST',
  GB: 'DHL',
  DE: 'DHL',
  FR: 'DHL',
  AU: 'EMS',
  KR: 'EMS',
  CN: 'EMS',
  DEFAULT: 'JAPAN_POST',
};

/**
 * 推奨配送業者を取得
 */
export function getRecommendedCarrier(country: string): ShippingCarrier {
  return COUNTRY_CARRIER_MAP[country.toUpperCase()] || COUNTRY_CARRIER_MAP.DEFAULT;
}

/**
 * 配送料金を計算
 */
export function calculateShippingCost(
  carrier: ShippingCarrier,
  weightGrams: number,
  country: string
): number {
  const rates = SHIPPING_RATES[carrier];
  let cost = rates.baseRate + weightGrams * rates.perGram;

  // 地域別追加料金
  const region = getRegion(country);
  if (region === 'AMERICAS') cost *= 1.2;
  if (region === 'EUROPE') cost *= 1.1;
  if (region === 'OCEANIA') cost *= 1.15;

  return Math.round(cost);
}

function getRegion(country: string): string {
  const americas = ['US', 'CA', 'MX', 'BR', 'AR'];
  const europe = ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'NO', 'DK', 'FI'];
  const oceania = ['AU', 'NZ'];
  const asia = ['KR', 'CN', 'TW', 'HK', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID'];

  const c = country.toUpperCase();
  if (americas.includes(c)) return 'AMERICAS';
  if (europe.includes(c)) return 'EUROPE';
  if (oceania.includes(c)) return 'OCEANIA';
  if (asia.includes(c)) return 'ASIA';
  return 'OTHER';
}

/**
 * 配送ラベルを生成
 */
export async function generateShippingLabel(
  orderId: string,
  options?: {
    carrier?: ShippingCarrier;
    weight?: number;
    dimensions?: { length: number; width: number; height: number };
    format?: LabelFormat;
  }
): Promise<ShippingLabel> {
  log.info({ type: 'generate_label_start', orderId });

  // 注文情報を取得
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { sales: true },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  // 配送先を解析
  const shippingAddress = parseShippingAddress(order);

  // 重量を計算（500g/アイテム）
  const weight = options?.weight || order.sales.length * 500;

  // 配送業者を決定
  const carrier = options?.carrier || getRecommendedCarrier(shippingAddress.country);

  // 配送料金を計算
  const shippingCost = calculateShippingCost(carrier, weight, shippingAddress.country);

  // トラッキング番号を生成（実際のAPIでは業者から取得）
  const trackingNumber = generateTrackingNumber(carrier);

  // ラベルを生成（実際のAPIではPDFを生成）
  const labelUrl = await generateLabelFile(
    carrier,
    trackingNumber,
    SENDER_ADDRESS,
    shippingAddress,
    weight,
    options?.format || 'PDF'
  );

  // DBに記録
  const labelRecord = await prisma.shadowLog.create({
    data: {
      service: 'shipping-label',
      operation: 'generate',
      input: {
        orderId,
        carrier,
        weight,
        dimensions: options?.dimensions,
        destination: shippingAddress.country,
      },
      output: {
        trackingNumber,
        labelUrl,
        shippingCost,
        format: options?.format || 'PDF',
      },
      decision: 'LABEL_GENERATED',
      decisionReason: `Shipping label generated for ${carrier}`,
      isDryRun: false,
    },
  });

  // 注文を更新
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'SHIPPED',
      shippedAt: new Date(),
    },
  });

  log.info({
    type: 'label_generated',
    orderId,
    carrier,
    trackingNumber,
    shippingCost,
  });

  return {
    id: labelRecord.id,
    orderId,
    carrier,
    trackingNumber,
    labelUrl,
    format: options?.format || 'PDF',
    weight,
    dimensions: options?.dimensions,
    shippingCost,
    createdAt: new Date(),
  };
}

/**
 * 配送先アドレスを解析
 */
function parseShippingAddress(order: any): ShippingAddress {
  // 実際のマーケットプレイスからの注文データをパース
  const marketplaceData = order.marketplaceData || {};

  return {
    name: marketplaceData.buyerName || 'Customer',
    street1: marketplaceData.shippingAddress?.street1 || 'Unknown',
    street2: marketplaceData.shippingAddress?.street2,
    city: marketplaceData.shippingAddress?.city || 'Unknown',
    state: marketplaceData.shippingAddress?.state,
    postalCode: marketplaceData.shippingAddress?.postalCode || '00000',
    country: marketplaceData.shippingAddress?.country || 'US',
    phone: marketplaceData.buyerPhone,
  };
}

/**
 * 商品重量を推定
 */
function estimateWeight(products: any[]): number {
  let totalWeight = 0;
  for (const product of products) {
    if (product) {
      // 商品メタデータから重量を取得、なければ500gをデフォルト
      const metadata = product.metadata || {};
      totalWeight += metadata.weight || 500;
    }
  }
  return Math.max(totalWeight, 100); // 最低100g
}

/**
 * トラッキング番号を生成（シミュレーション）
 */
function generateTrackingNumber(carrier: ShippingCarrier): string {
  const prefix: Record<ShippingCarrier, string> = {
    JAPAN_POST: 'JP',
    EMS: 'EJ',
    DHL: 'DHL',
    FEDEX: 'FX',
    UPS: 'UPS',
  };
  const random = Math.random().toString(36).substring(2, 12).toUpperCase();
  return `${prefix[carrier]}${random}`;
}

/**
 * ラベルファイルを生成（シミュレーション）
 */
async function generateLabelFile(
  carrier: ShippingCarrier,
  trackingNumber: string,
  sender: ShippingAddress,
  recipient: ShippingAddress,
  weight: number,
  format: LabelFormat
): Promise<string> {
  // 実際の実装ではPDFを生成してS3にアップロード
  // ここではシミュレーションとしてURLを返す
  const labelId = `label_${Date.now()}_${trackingNumber}`;
  return `https://storage.rakuda.example.com/labels/${labelId}.${format.toLowerCase()}`;
}

/**
 * 一括ラベル生成
 */
export async function generateBulkLabels(
  orderIds: string[],
  carrier?: ShippingCarrier
): Promise<{
  generated: number;
  failed: number;
  labels: ShippingLabel[];
  errors: Array<{ orderId: string; error: string }>;
}> {
  const result = {
    generated: 0,
    failed: 0,
    labels: [] as ShippingLabel[],
    errors: [] as Array<{ orderId: string; error: string }>,
  };

  for (const orderId of orderIds) {
    try {
      const label = await generateShippingLabel(orderId, { carrier });
      result.labels.push(label);
      result.generated++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({ orderId, error: error.message });
      log.error({ type: 'bulk_label_error', orderId, error: error.message });
    }
  }

  return result;
}

/**
 * 配送状況を取得（シミュレーション）
 */
export async function getTrackingStatus(trackingNumber: string): Promise<{
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION';
  lastUpdate: Date;
  location?: string;
  events: Array<{ timestamp: Date; event: string; location: string }>;
}> {
  // 実際の実装では配送業者APIを呼び出し
  return {
    status: 'IN_TRANSIT',
    lastUpdate: new Date(),
    location: 'Tokyo, Japan',
    events: [
      { timestamp: new Date(), event: 'Package shipped', location: 'Tokyo, Japan' },
    ],
  };
}

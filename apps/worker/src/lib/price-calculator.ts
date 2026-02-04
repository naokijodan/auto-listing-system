import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'price-calculator' });

export interface PriceCalculationInput {
  // 仕入価格（円）
  sourcePrice: number;
  // 重量（グラム）
  weight?: number;
  // カテゴリ
  category?: string;
  // 出品先
  marketplace: 'joom' | 'ebay';
  // 地域（eBay用）
  region?: string;
  // DDU/DDP（eBay用）
  shippingType?: 'DDU' | 'DDP';
}

export interface PriceCalculationResult {
  // 出品価格（USD）
  listingPrice: number;
  // 送料（USD）
  shippingCost: number;
  // 内訳
  breakdown: {
    sourcePrice: number;        // 仕入価格（円）
    sourcePriceUsd: number;     // 仕入価格（USD）
    platformFee: number;        // プラットフォーム手数料
    paymentFee: number;         // 決済手数料
    shippingCost: number;       // 送料
    adCost: number;             // 広告費
    profit: number;             // 利益
    exchangeRate: number;       // 使用した為替レート
  };
  // 設定
  settings: {
    platformFeeRate: number;
    paymentFeeRate: number;
    profitRate: number;
    adRate: number;
  };
}

/**
 * 為替レートを取得
 */
async function getExchangeRate(): Promise<number> {
  const rate = await prisma.exchangeRate.findFirst({
    where: {
      fromCurrency: 'JPY',
      toCurrency: 'USD',
    },
    orderBy: { fetchedAt: 'desc' },
  });

  return rate?.rate || 0.0067; // デフォルト: 1 USD = 150 JPY
}

/**
 * 価格設定を取得
 */
async function getPriceSetting(marketplace: 'joom' | 'ebay', category?: string) {
  // カテゴリ別設定を探す
  if (category) {
    const categorySetting = await prisma.priceSetting.findFirst({
      where: {
        marketplace: marketplace.toUpperCase() as any,
        isDefault: false,
      },
    });

    if (categorySetting) {
      const categorySettings = categorySetting.categorySettings as Record<string, any>;
      if (categorySettings[category]) {
        return {
          ...categorySetting,
          ...categorySettings[category],
        };
      }
    }
  }

  // デフォルト設定
  const defaultSetting = await prisma.priceSetting.findFirst({
    where: {
      marketplace: marketplace.toUpperCase() as any,
      isDefault: true,
    },
  });

  if (!defaultSetting) {
    // フォールバック値
    return {
      platformFeeRate: marketplace === 'joom' ? 0.15 : 0.13,
      paymentFeeRate: 0.03,
      targetProfitRate: 0.30,
      adRate: 0,
      exchangeRate: await getExchangeRate(),
      exchangeBuffer: 0.02,
    };
  }

  return defaultSetting;
}

/**
 * 送料を取得
 */
async function getShippingCost(
  weight: number,
  marketplace: 'joom' | 'ebay',
  region?: string
): Promise<number> {
  if (marketplace === 'joom') {
    // Joomは送料込み価格が一般的
    // 簡易計算: 重量ベース
    const baseShipping = 5; // USD
    const perGram = 0.01; // USD/g
    return baseShipping + (weight * perGram);
  }

  // eBay: 地域別送料テーブル
  const policy = await prisma.shippingPolicy.findFirst({
    where: {
      region: region || 'US',
      isActive: true,
    },
  });

  if (!policy) {
    // デフォルト送料
    return 12; // USD
  }

  const shippingTable = policy.shippingTable as Record<string, number>;

  // 重量に対応する送料を検索
  const weightThresholds = Object.keys(shippingTable)
    .map(Number)
    .sort((a, b) => a - b);

  for (const threshold of weightThresholds) {
    if (weight <= threshold) {
      const costJpy = shippingTable[threshold.toString()];
      const rate = await getExchangeRate();
      return costJpy * rate;
    }
  }

  // 最大重量を超えた場合
  const maxThreshold = weightThresholds[weightThresholds.length - 1];
  const maxCostJpy = shippingTable[maxThreshold.toString()];
  const rate = await getExchangeRate();
  return maxCostJpy * rate;
}

/**
 * 価格を計算
 *
 * 計算式:
 * 出品価格 = (仕入価格USD + 送料) / (1 - プラットフォーム手数料率 - 決済手数料率 - 広告費率 - 利益率)
 */
export async function calculatePrice(
  input: PriceCalculationInput
): Promise<PriceCalculationResult> {
  const { sourcePrice, weight = 200, category, marketplace, region } = input;

  log.info({
    type: 'price_calculation_start',
    sourcePrice,
    weight,
    marketplace,
  });

  // 設定取得
  const setting = await getPriceSetting(marketplace, category);
  const exchangeRate = await getExchangeRate();

  // 仕入価格をUSDに変換
  const sourcePriceUsd = sourcePrice * exchangeRate;

  // 送料計算
  const shippingCost = await getShippingCost(weight, marketplace, region);

  // 手数料率
  const platformFeeRate = setting.platformFeeRate;
  const paymentFeeRate = setting.paymentFeeRate;
  const profitRate = setting.targetProfitRate;
  const adRate = setting.adRate || 0;

  // 合計控除率
  const totalDeductionRate = platformFeeRate + paymentFeeRate + adRate + profitRate;

  // 出品価格計算
  // 出品価格 = (仕入価格USD + 送料) / (1 - 控除率)
  const baseCost = sourcePriceUsd + shippingCost;
  const listingPrice = baseCost / (1 - totalDeductionRate);

  // 内訳計算
  const platformFee = listingPrice * platformFeeRate;
  const paymentFee = listingPrice * paymentFeeRate;
  const adCost = listingPrice * adRate;
  const profit = listingPrice * profitRate;

  // 小数点2位で丸め
  const roundedPrice = Math.ceil(listingPrice * 100) / 100;

  log.info({
    type: 'price_calculation_complete',
    sourcePrice,
    listingPrice: roundedPrice,
    profit: profit.toFixed(2),
  });

  return {
    listingPrice: roundedPrice,
    shippingCost: Math.round(shippingCost * 100) / 100,
    breakdown: {
      sourcePrice,
      sourcePriceUsd: Math.round(sourcePriceUsd * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      paymentFee: Math.round(paymentFee * 100) / 100,
      shippingCost: Math.round(shippingCost * 100) / 100,
      adCost: Math.round(adCost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      exchangeRate,
    },
    settings: {
      platformFeeRate,
      paymentFeeRate,
      profitRate,
      adRate,
    },
  };
}

/**
 * 複数地域の価格を一括計算（eBay用）
 */
export async function calculatePricesForRegions(
  input: Omit<PriceCalculationInput, 'region'>,
  regions: string[] = ['US', 'EU', 'ASIA']
): Promise<Record<string, PriceCalculationResult>> {
  const results: Record<string, PriceCalculationResult> = {};

  for (const region of regions) {
    results[region] = await calculatePrice({
      ...input,
      region,
    });
  }

  return results;
}

/**
 * 為替レートを更新（API経由）
 */
export async function updateExchangeRate(): Promise<number> {
  try {
    // 外部APIから為替レート取得（例: exchangerate-api.com）
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD'
    );
    const data = await response.json();
    const jpyRate = data.rates?.JPY;

    if (jpyRate) {
      const usdToJpy = 1 / jpyRate; // JPY → USD

      await prisma.exchangeRate.create({
        data: {
          fromCurrency: 'JPY',
          toCurrency: 'USD',
          rate: usdToJpy,
          source: 'exchangerate-api',
        },
      });

      log.info({
        type: 'exchange_rate_updated',
        rate: usdToJpy,
        jpyPerUsd: jpyRate,
      });

      return usdToJpy;
    }
  } catch (error: any) {
    log.error({
      type: 'exchange_rate_update_failed',
      error: error.message,
    });
  }

  return await getExchangeRate();
}

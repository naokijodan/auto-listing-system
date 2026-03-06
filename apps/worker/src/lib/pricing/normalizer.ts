import { prisma, Marketplace } from '@rakuda/database';
import { EXCHANGE_RATE_DEFAULTS, SHIPPING_DEFAULTS } from '@rakuda/config';
import { logger } from '@rakuda/logger';
import type { NormalizedInput, PriceCalculationInput } from './types';

// 為替レートと送料を正規化
export async function normalize(input: PriceCalculationInput): Promise<NormalizedInput> {
  const rate = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: 'JPY', toCurrency: 'USD' },
    orderBy: { fetchedAt: 'desc' },
  });

  const exchangeRate = rate?.rate || EXCHANGE_RATE_DEFAULTS.JPY_TO_USD;
  let exchangeRateSource = rate ? 'DB:exchange_rates' : 'DEFAULT:EXCHANGE_RATE_DEFAULTS';

  // サニティチェック: JPY→USD は 0.001〜0.02 の範囲
  let finalExchangeRate = exchangeRate;
  if (exchangeRate > 1) {
    // USD→JPY として保存されている可能性 → 逆数を使用
    finalExchangeRate = 1 / exchangeRate;
    exchangeRateSource = `${exchangeRateSource}:corrected`;
    logger.warn(
      {
        type: 'exchange_rate_inverted',
        originalRate: exchangeRate,
        correctedRate: finalExchangeRate,
      },
      'Exchange rate appears to be USD→JPY, inverting to JPY→USD'
    );
  } else if (exchangeRate < 0.001 || exchangeRate > 0.02) {
    // 異常値 → デフォルト値を使用
    finalExchangeRate = EXCHANGE_RATE_DEFAULTS.JPY_TO_USD;
    if (rate) exchangeRateSource = `${exchangeRateSource}:corrected`;
    logger.warn(
      {
        type: 'exchange_rate_out_of_range',
        originalRate: exchangeRate,
        fallbackRate: finalExchangeRate,
      },
      'Exchange rate out of expected range, using default'
    );
  }

  const weight = input.weight ?? 0;

  // ShippingRateEntry からの送料取得を試みる
  let shippingCostJpy = 0;
  let shippingCostUsd = 0;
  let shippingMethod = input.shippingMethod || '';
  let shippingResolved = false;

  if (shippingMethod && weight > 0) {
    const entry = await prisma.shippingRateEntry.findFirst({
      where: {
        shippingMethod,
        weightMin: { lte: weight },
        weightMax: { gte: weight },
        isActive: true,
      },
    });
    if (entry) {
      shippingCostJpy = entry.costJpy;
      shippingCostUsd = entry.costJpy * finalExchangeRate;
      shippingResolved = true;
    }
  }

  // フォールバック: ShippingRateEntry が見つからない場合
  if (!shippingResolved) {
    if (input.marketplace === Marketplace.JOOM) {
      const { baseCost, perGramCost } = SHIPPING_DEFAULTS.JOOM;
      shippingCostUsd = baseCost + weight * perGramCost;
      shippingMethod = shippingMethod || 'JOOM_STANDARD';
      shippingCostJpy = shippingCostUsd / finalExchangeRate;
    } else if (input.marketplace === Marketplace.EBAY) {
      shippingCostUsd = SHIPPING_DEFAULTS.EBAY.defaultCost;
      shippingMethod = shippingMethod || 'EBAY_DEFAULT';
      shippingCostJpy = shippingCostUsd / finalExchangeRate;
    } else {
      shippingCostUsd = 0;
      shippingMethod = shippingMethod || 'STANDARD';
      shippingCostJpy = 0;
    }
  }

  // JPY→USD 直レートで換算
  const sourcePriceUsd = input.sourcePrice * finalExchangeRate;

  return {
    sourcePriceUsd,
    shippingCostJpy,
    shippingCostUsd,
    exchangeRate: finalExchangeRate,
    exchangeRateSource,
    shippingMethod,
    original: { ...input },
  };
}

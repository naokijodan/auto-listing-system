import { prisma, Marketplace } from '@rakuda/database';
import { EXCHANGE_RATE_DEFAULTS, SHIPPING_DEFAULTS } from '@rakuda/config';
import type { NormalizedInput, PriceCalculationInput } from './types';

// 為替レートと送料を正規化
export async function normalize(input: PriceCalculationInput): Promise<NormalizedInput> {
  const rate = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: 'JPY', toCurrency: 'USD' },
    orderBy: { fetchedAt: 'desc' },
  });

  const exchangeRate = rate?.rate || EXCHANGE_RATE_DEFAULTS.JPY_TO_USD;
  const exchangeRateSource = rate ? 'DB:exchange_rates' : 'DEFAULT:EXCHANGE_RATE_DEFAULTS';

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
      shippingCostUsd = entry.costJpy * exchangeRate;
      shippingResolved = true;
    }
  }

  // フォールバック: ShippingRateEntry が見つからない場合
  if (!shippingResolved) {
    if (input.marketplace === Marketplace.JOOM) {
      const { baseCost, perGramCost } = SHIPPING_DEFAULTS.JOOM;
      shippingCostUsd = baseCost + weight * perGramCost;
      shippingMethod = shippingMethod || 'JOOM_STANDARD';
      shippingCostJpy = shippingCostUsd / exchangeRate;
    } else if (input.marketplace === Marketplace.EBAY) {
      shippingCostUsd = SHIPPING_DEFAULTS.EBAY.defaultCost;
      shippingMethod = shippingMethod || 'EBAY_DEFAULT';
      shippingCostJpy = shippingCostUsd / exchangeRate;
    } else {
      shippingCostUsd = 0;
      shippingMethod = shippingMethod || 'STANDARD';
      shippingCostJpy = 0;
    }
  }

  // JPY→USD 直レートで換算
  const sourcePriceUsd = input.sourcePrice * exchangeRate;

  return {
    sourcePriceUsd,
    shippingCostJpy,
    shippingCostUsd,
    exchangeRate,
    exchangeRateSource,
    shippingMethod,
    original: { ...input },
  };
}

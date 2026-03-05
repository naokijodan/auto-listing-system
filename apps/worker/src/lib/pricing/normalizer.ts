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

  // 送料計算（簡易）
  let shippingCostUsd = 0;
  let shippingMethod = input.shippingMethod || '';
  if (input.marketplace === Marketplace.JOOM) {
    const { baseCost, perGramCost } = SHIPPING_DEFAULTS.JOOM;
    shippingCostUsd = baseCost + weight * perGramCost;
    shippingMethod = shippingMethod || 'JOOM_STANDARD';
  } else if (input.marketplace === Marketplace.EBAY) {
    shippingCostUsd = SHIPPING_DEFAULTS.EBAY.defaultCost;
    shippingMethod = shippingMethod || 'EBAY_DEFAULT';
  } else {
    shippingCostUsd = 0;
    shippingMethod = shippingMethod || 'STANDARD';
  }

  // JPY→USD 直レートで換算
  const sourcePriceUsd = input.sourcePrice * exchangeRate;

  // 送料（円）は参考値としてUSD→JPY換算（直レートの逆数）
  const shippingCostJpy = shippingCostUsd / exchangeRate;

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


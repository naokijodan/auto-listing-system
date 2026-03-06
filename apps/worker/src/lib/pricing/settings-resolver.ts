import { prisma, Marketplace } from '@rakuda/database';
import { PRICE_DEFAULTS } from '@rakuda/config';
import type { ResolvedSettings } from './types';

export async function resolveSettings(
  marketplace: Marketplace,
  category?: string,
  productId?: string
): Promise<ResolvedSettings> {
  const ts = new Date();

  // 1. ProductPriceOverride（商品個別）
  if (productId) {
    const override = await prisma.productPriceOverride.findFirst({
      where: { productId, marketplace, isActive: true },
    });
    if (override) {
      // ベースは marketplace デフォルト
      const defaults = marketplace === Marketplace.JOOM ? PRICE_DEFAULTS.JOOM : PRICE_DEFAULTS.EBAY;
      const profitRate = override.customProfitRate ?? defaults.targetProfitRate;
      const profitAmount = override.customProfitAmount ?? 0;
      const base: Omit<ResolvedSettings, 'version' | 'adjustedDutyRate'> = {
        platformFeeRate: defaults.platformFeeRate,
        paymentFeeRate: defaults.paymentFeeRate,
        adRate: defaults.adRate,
        profitRate,
        profitAmount,
        dutyRate: defaults.dutyRate ?? 0,
        vatRate: defaults.vatRate ?? 0,
        dutyProcessingFeeRate: defaults.dutyProcessingFeeRate ?? 0,
        mpfAmount: defaults.mpfAmount ?? 0,
        customsClearanceFeeJpy: defaults.customsClearanceFeeJpy ?? 0,
        euShippingDiffJpy: defaults.euShippingDiffJpy ?? 0,
        exchangeBufferRate: defaults.exchangeBuffer,
      };
      const adjustedDutyRate = base.dutyRate === 0 ? 0 : base.dutyRate / (1 - base.platformFeeRate - base.adRate);
      return {
        ...base,
        adjustedDutyRate,
        version: ts.toISOString(),
      };
    }
  }

  // 2. priceSetting（marketplace × category）
  if (category) {
    const categorySetting = await prisma.priceSetting.findFirst({
      where: { marketplace, isDefault: false },
    });
    if (categorySetting) {
      const c = categorySetting.categorySettings as Record<string, any>;
      const cat = c?.[category];
      if (cat) {
        const base: Omit<ResolvedSettings, 'version' | 'adjustedDutyRate'> = {
          platformFeeRate: cat.platformFeeRate ?? categorySetting.platformFeeRate,
          paymentFeeRate: cat.paymentFeeRate ?? categorySetting.paymentFeeRate,
          adRate: cat.adRate ?? categorySetting.adRate,
          profitRate: cat.targetProfitRate ?? categorySetting.targetProfitRate,
          profitAmount: 0,
          dutyRate: 0,
          vatRate: 0,
          dutyProcessingFeeRate: 0,
          mpfAmount: 0,
          customsClearanceFeeJpy: 0,
          euShippingDiffJpy: 0,
          exchangeBufferRate: categorySetting.exchangeBuffer,
        };
        const adjustedDutyRate = 0; // Joom/Ebay default here
        return { ...base, adjustedDutyRate, version: ts.toISOString() };
      }
    }
  }

  // 3. priceSetting（marketplace × isDefault=true）
  const defaultSetting = await prisma.priceSetting.findFirst({
    where: { marketplace, isDefault: true },
  });

  if (defaultSetting) {
    const defaults = marketplace === Marketplace.JOOM ? PRICE_DEFAULTS.JOOM : PRICE_DEFAULTS.EBAY;
    const base: Omit<ResolvedSettings, 'version' | 'adjustedDutyRate'> = {
      platformFeeRate: defaultSetting.platformFeeRate,
      paymentFeeRate: defaultSetting.paymentFeeRate,
      adRate: defaultSetting.adRate,
      profitRate: defaultSetting.targetProfitRate,
      profitAmount: 0,
      dutyRate: defaults.dutyRate ?? 0,
      vatRate: defaults.vatRate ?? 0,
      dutyProcessingFeeRate: defaults.dutyProcessingFeeRate ?? 0,
      mpfAmount: defaults.mpfAmount ?? 0,
      customsClearanceFeeJpy: defaults.customsClearanceFeeJpy ?? 0,
      euShippingDiffJpy: defaults.euShippingDiffJpy ?? 0,
      exchangeBufferRate: defaultSetting.exchangeBuffer,
    };
    const adjustedDutyRate = base.dutyRate === 0 ? 0 : base.dutyRate / (1 - base.platformFeeRate - base.adRate);
    return { ...base, adjustedDutyRate, version: ts.toISOString() };
  }

  // 4. PRICE_DEFAULTS フォールバック
  const defaults = marketplace === Marketplace.JOOM ? PRICE_DEFAULTS.JOOM : PRICE_DEFAULTS.EBAY;
  const base: Omit<ResolvedSettings, 'version' | 'adjustedDutyRate'> = {
    platformFeeRate: defaults.platformFeeRate,
    paymentFeeRate: defaults.paymentFeeRate,
    adRate: defaults.adRate,
    profitRate: defaults.targetProfitRate,
    profitAmount: 0,
    dutyRate: defaults.dutyRate ?? 0,
    vatRate: defaults.vatRate ?? 0,
    dutyProcessingFeeRate: defaults.dutyProcessingFeeRate ?? 0,
    mpfAmount: defaults.mpfAmount ?? 0,
    customsClearanceFeeJpy: defaults.customsClearanceFeeJpy ?? 0,
    euShippingDiffJpy: defaults.euShippingDiffJpy ?? 0,
    exchangeBufferRate: defaults.exchangeBuffer,
  };
  const adjustedDutyRate = base.dutyRate === 0 ? 0 : base.dutyRate / (1 - base.platformFeeRate - base.adRate);
  return { ...base, adjustedDutyRate, version: ts.toISOString() };
}

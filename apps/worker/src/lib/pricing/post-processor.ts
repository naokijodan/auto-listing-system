import { logger } from '@rakuda/logger';
import { MARKETPLACE_PRICE_LIMITS } from '@rakuda/config';
import type { PriceCalculationResult } from './types';

export function postProcess(result: PriceCalculationResult): PriceCalculationResult {
  // 端数処理: 2桁に丸め（切り上げ）
  const roundedFinal = Math.ceil(result.finalPrice * 100) / 100;

  const updated: PriceCalculationResult = {
    ...result,
    finalPrice: roundedFinal,
  };

  // 最低利益率バリデーション（5%未満）
  if (updated.breakdown.profitRate < 0.05) {
    logger.warn({ profitRate: updated.breakdown.profitRate }, 'Profit rate below 5% threshold');
  }

  // 価格上限チェック: JOOM → 900000円相当超えたら警告
  if (updated.metadata.marketplace === 'JOOM') {
    const rate = updated.metadata.exchangeRate || 0.0067;
    const jpyEquivalent = updated.finalPrice / rate;
    if (jpyEquivalent > MARKETPLACE_PRICE_LIMITS.JOOM_PRICE_LIMIT_JPY) {
      logger.warn(
        { finalPrice: updated.finalPrice, jpyEquivalent },
        'Joom price exceeds JP¥ upper limit'
      );
    }
  }

  return updated;
}


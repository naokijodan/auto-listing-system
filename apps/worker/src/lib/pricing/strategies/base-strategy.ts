import type { Marketplace } from '@rakuda/database';
import type { NormalizedInput, ResolvedSettings, PriceCalculationResult } from '../types';

export abstract class BasePricingStrategy {
  abstract readonly marketplace: Marketplace;
  abstract calculate(
    normalizedInput: NormalizedInput,
    settings: ResolvedSettings
  ): PriceCalculationResult;
}


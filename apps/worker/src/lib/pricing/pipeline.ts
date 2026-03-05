import type { PriceCalculationInput, PriceCalculationResult } from './types';
import { resolveSettings } from './settings-resolver';
import { normalize } from './normalizer';
import { createStrategy } from './strategies';
import { postProcess } from './post-processor';

export class PricingPipeline {
  async calculate(input: PriceCalculationInput): Promise<PriceCalculationResult> {
    const settings = await resolveSettings(input.marketplace, input.category, input.productId);
    const normalized = await normalize(input);
    const strategy = createStrategy(input.marketplace);
    const result = strategy.calculate(normalized, settings);
    return postProcess(result);
  }
}


import { Marketplace } from '@rakuda/database';
import { BasePricingStrategy } from './base-strategy';
import { JoomPricingStrategy } from './joom-strategy';

export function createStrategy(marketplace: Marketplace): BasePricingStrategy {
  if (marketplace === Marketplace.JOOM) {
    return new JoomPricingStrategy();
  }
  if (marketplace === Marketplace.EBAY) {
    throw new Error('EbayPricingStrategy not yet implemented');
  }
  throw new Error(`Unsupported marketplace: ${marketplace}`);
}

export { BasePricingStrategy } from './base-strategy';
export { JoomPricingStrategy } from './joom-strategy';


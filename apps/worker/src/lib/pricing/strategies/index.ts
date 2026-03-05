import { Marketplace } from '@rakuda/database';
import { BasePricingStrategy } from './base-strategy';
import { JoomPricingStrategy } from './joom-strategy';
import { EbayPricingStrategy } from './ebay-strategy';

export function createStrategy(marketplace: Marketplace): BasePricingStrategy {
  if (marketplace === Marketplace.JOOM) {
    return new JoomPricingStrategy();
  }
  if (marketplace === Marketplace.EBAY) {
    return new EbayPricingStrategy();
  }
  throw new Error(`Unsupported marketplace: ${marketplace}`);
}

export { BasePricingStrategy } from './base-strategy';
export { JoomPricingStrategy } from './joom-strategy';
export { EbayPricingStrategy } from './ebay-strategy';

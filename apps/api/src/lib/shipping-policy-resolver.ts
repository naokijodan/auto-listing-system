import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'shipping-policy-resolver' });

// Shipping method to eBay carrier mapping
const METHOD_CARRIER_MAP: Record<string, string> = {
  EP: 'ePacket',
  CF: 'Cpass',
  CD: 'Cpass',
  CE: 'Cpass',
  EL: 'ePacket',
  EMS: 'EMS',
};

// Price-based shipping method recommendation
// Higher value items get more reliable/trackable shipping
interface ShippingRecommendation {
  method: string;
  reason: string;
}

export function recommendShippingMethod(priceJpy: number): ShippingRecommendation {
  if (priceJpy >= 100000) {
    return { method: 'EMS', reason: 'High-value item (100K+ JPY) - use EMS for full tracking & insurance' };
  }
  if (priceJpy >= 30000) {
    return { method: 'CD', reason: 'Mid-high value (30K+ JPY) - Cpass DDP for duty-inclusive shipping' };
  }
  if (priceJpy >= 10000) {
    return { method: 'CF', reason: 'Mid value (10K+ JPY) - Cpass Flat for cost-effective tracked shipping' };
  }
  return { method: 'EP', reason: 'Standard value - ePacket for economy shipping' };
}

export async function resolveShippingPolicy(params: {
  shippingMethod?: string | null;
  priceJpy?: number;
}): Promise<{
  fulfillmentPolicyId: string | null;
  shippingMethod: string;
  carrier: string;
  reason: string;
}> {
  const { shippingMethod, priceJpy } = params;

  // Determine shipping method
  let method = shippingMethod as string | null | undefined;
  let reason = 'User-selected shipping method';

  if (!method && typeof priceJpy === 'number') {
    const recommendation = recommendShippingMethod(priceJpy);
    method = recommendation.method;
    reason = recommendation.reason;
  }

  if (!method) {
    method = 'EP';
    reason = 'Default: ePacket';
  }

  const carrier = METHOD_CARRIER_MAP[method] || method;

  // Find matching ShippingPolicy in DB
  const policy = await prisma.shippingPolicy.findFirst({
    where: {
      carrier,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (policy) {
    log.info({
      type: 'shipping_policy_resolved',
      method,
      carrier,
      policyId: policy.id,
      policyName: policy.name,
      reason,
    });

    return {
      fulfillmentPolicyId: policy.id,
      shippingMethod: method,
      carrier,
      reason: `${reason} -> Policy: ${policy.name}`,
    };
  }

  log.warn({
    type: 'shipping_policy_not_found',
    method,
    carrier,
    reason: 'No matching ShippingPolicy in DB - fulfillmentPolicyId will be null',
  });

  return {
    fulfillmentPolicyId: null,
    shippingMethod: method,
    carrier,
    reason: `${reason} -> No matching policy found in DB`,
  };
}


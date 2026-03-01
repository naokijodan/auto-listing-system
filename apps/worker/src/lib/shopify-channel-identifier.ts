/**
 * Shopify Sales Channel Identifier
 * app_id ベースで注文の販売チャネルを識別する
 */

export const SHOPIFY_APP_IDS: Record<number, { name: string; code: string }> = {
  580111: { name: 'Online Store', code: 'ONLINE_STORE' },
  129785: { name: 'Point of Sale', code: 'POS' },
  1354745: { name: 'Draft Orders', code: 'DRAFT_ORDER' },
  2329312: { name: 'Facebook & Instagram', code: 'INSTAGRAM' },
  4383523: { name: 'TikTok', code: 'TIKTOK' },
  1780363: { name: 'Google & YouTube', code: 'GOOGLE_YOUTUBE' },
  3009811: { name: 'Pinterest', code: 'PINTEREST' },
  3890849: { name: 'Shop App', code: 'SHOP_APP' },
  88312: { name: 'Buy Button', code: 'BUY_BUTTON' },
};

const SOURCE_NAME_MAP: Record<string, string> = {
  web: 'ONLINE_STORE',
  pos: 'POS',
  shopify_draft_order: 'DRAFT_ORDER',
  iphone: 'SHOPIFY_MOBILE',
  android: 'SHOPIFY_MOBILE',
};

export interface ChannelInfo {
  name: string;
  code: string;
  requiresHoldCheck: boolean;
  requiresPaymentCapture: boolean;
}

export function identifyShopifyChannel(order: {
  app_id?: number;
  source_name?: string;
  fulfillment_status?: string | null;
  financial_status?: string;
}): ChannelInfo {
  // Primary: use app_id
  if (order.app_id) {
    const channel = SHOPIFY_APP_IDS[order.app_id];
    if (channel) {
      return {
        ...channel,
        requiresHoldCheck:
          ['INSTAGRAM', 'TIKTOK'].includes(channel.code) && order.fulfillment_status === 'on_hold',
        requiresPaymentCapture:
          channel.code === 'INSTAGRAM' && order.financial_status === 'authorized',
      };
    }
  }

  // Secondary: use source_name (protected values)
  if (order.source_name) {
    const code = SOURCE_NAME_MAP[order.source_name];
    if (code) {
      return {
        name: code,
        code,
        requiresHoldCheck: false,
        requiresPaymentCapture: false,
      };
    }
  }

  // Fallback: unknown channel
  return {
    name: `Unknown (app_id: ${order.app_id}, source: ${order.source_name})`,
    code: 'UNKNOWN',
    requiresHoldCheck: false,
    requiresPaymentCapture: false,
  };
}


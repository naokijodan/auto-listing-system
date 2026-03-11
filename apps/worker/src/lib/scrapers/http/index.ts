export interface HttpInventoryResult {
  available: boolean;
  price?: number;
  title?: string;
  status: 'available' | 'sold' | 'ended' | 'deleted' | 'unknown';
  checkedAt: Date;
  method: 'http';
}

export { checkMercariHttp } from './mercari-http';
export { checkYahooAuctionHttp } from './yahoo-auction-http';
export { checkAmazonHttp } from './amazon-http';
export { checkPayPayFleaHttp } from './paypay-flea-http';
export { checkRakumaHttp } from './rakuma-http';

// Common helpers
export const DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';

export async function fetchWithTimeout(url: string, timeoutMs = 10000, headers: Record<string, string> = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        ...headers,
      },
    } as any);
    return res;
  } finally {
    clearTimeout(id);
  }
}

export function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (m) return m[1].trim();
  return undefined;
}

export function extractYenPrice(html: string): number | undefined {
  // Prefer obvious price patterns first
  const pricePatterns = [
    /data-testid=\"item-price\"[^>]*>[\s\S]*?([\u00A5¥]\s?[0-9,.]+)/i,
    /id=\"priceblock_[a-z_]+\"[^>]*>\s*([\u00A5¥]\s?[0-9,.]+)/i,
    /class=\"a-offscreen\"[^>]*>\s*([\u00A5¥]\s?[0-9,.]+)/i,
    /現在価格[^0-9]*([\u00A5¥]\s?[0-9,.]+)/i,
    /price[^0-9A-Za-z]{0,10}([\u00A5¥]\s?[0-9,.]+)/i,
    /([\u00A5¥]\s?[0-9,.]+)/,
  ];
  for (const re of pricePatterns) {
    const mm = html.match(re);
    if (mm && mm[1]) {
      const n = parseInt(mm[1].replace(/[^0-9]/g, ''), 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return undefined;
}


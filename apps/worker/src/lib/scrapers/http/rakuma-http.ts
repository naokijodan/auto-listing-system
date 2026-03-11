import { HttpInventoryResult, fetchWithTimeout, extractTitle, extractYenPrice } from './index';

export async function checkRakumaHttp(url: string): Promise<HttpInventoryResult> {
  try {
    const res = await fetchWithTimeout(url, 10000, {
      Referer: 'https://fril.jp/',
    });

    if (res.status === 404) {
      return {
        available: false,
        status: 'deleted',
        checkedAt: new Date(),
        method: 'http',
      };
    }

    const html = await res.text();
    const title = extractTitle(html);

    const soldPatterns = [
      /SOLD OUT/i,
      /売り切れ/i,
      /売り切れました/i,
    ];
    const isSold = soldPatterns.some(r => r.test(html));

    const price = extractYenPrice(html);

    return {
      available: !isSold,
      price,
      title,
      status: isSold ? 'sold' : 'available',
      checkedAt: new Date(),
      method: 'http',
    };
  } catch (_e) {
    return {
      available: true,
      status: 'unknown',
      checkedAt: new Date(),
      method: 'http',
    };
  }
}


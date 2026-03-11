import { HttpInventoryResult, fetchWithTimeout, extractTitle, extractYenPrice } from './index';

export async function checkPayPayFleaHttp(url: string): Promise<HttpInventoryResult> {
  try {
    const res = await fetchWithTimeout(url, 10000, {
      Referer: 'https://paypayfleamarket.yahoo.co.jp/',
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
      /売り切れました/i,
      /この商品は取引が終了しています/i,
      /販売停止中/i,
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


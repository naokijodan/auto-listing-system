import { HttpInventoryResult, fetchWithTimeout, extractTitle, extractYenPrice } from './index';

export async function checkAmazonHttp(url: string): Promise<HttpInventoryResult> {
  try {
    const res = await fetchWithTimeout(url, 10000, {
      Referer: 'https://www.amazon.co.jp/',
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

    // Check for captcha/robot page: treat as unknown (safe side available)
    if (/Robot Check|verify you are a human|CAPTCHA/i.test(html)) {
      return {
        available: true,
        status: 'unknown',
        title,
        checkedAt: new Date(),
        method: 'http',
      };
    }

    const oosPatterns = [
      /在庫切れ/i,
      /現在在庫切れです/i,
      /この商品は現在お取り扱いできません/i,
      /Currently unavailable/i,
      /Temporarily out of stock/i,
    ];
    const isOut = oosPatterns.some(r => r.test(html));

    const price = extractYenPrice(html);

    return {
      available: !isOut,
      price,
      title,
      status: isOut ? 'sold' : 'available',
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


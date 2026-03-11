import { HttpInventoryResult, fetchWithTimeout, extractTitle, extractYenPrice } from './index';

export async function checkYahooAuctionHttp(url: string): Promise<HttpInventoryResult> {
  try {
    const res = await fetchWithTimeout(url, 10000, {
      Referer: 'https://auctions.yahoo.co.jp/',
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

    // Determine auction status
    const endedPatterns = [
      /このオークションは終了しています/i,
      /オークションは終了/i,
      /入札は終了しました/i,
      /落札されました/i,
      /終了しました/i,
    ];
    const isEnded = endedPatterns.some(r => r.test(html));

    const price = extractYenPrice(html);

    return {
      available: !isEnded,
      price,
      title,
      status: isEnded ? 'ended' : 'available',
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


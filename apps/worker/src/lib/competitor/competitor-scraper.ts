/**
 * 競合価格スクレイパー（Phase 29）
 *
 * 各マーケットプレイスから競合価格を取得
 */

import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'CompetitorScraper' });

export interface ScrapeResult {
  success: boolean;
  price?: number;
  currency?: string;
  title?: string;
  conditionRank?: string;
  sellerRating?: number;
  stockStatus?: string;
  shippingCost?: number;
  error?: string;
}

export interface ScraperConfig {
  timeout: number;
  retries: number;
  userAgent: string;
}

const DEFAULT_CONFIG: ScraperConfig = {
  timeout: 30000,
  retries: 2,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

class CompetitorScraper {
  private config: ScraperConfig;

  constructor(config?: Partial<ScraperConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * URLから価格を取得
   */
  async scrape(url: string, marketplace: string): Promise<ScrapeResult> {
    log.debug({
      type: 'scrape_start',
      url,
      marketplace,
    });

    try {
      switch (marketplace.toLowerCase()) {
        case 'ebay':
          return await this.scrapeEbay(url);
        case 'amazon':
          return await this.scrapeAmazon(url);
        case 'mercari':
          return await this.scrapeMercari(url);
        case 'yahoo_auction':
        case 'yahoo':
          return await this.scrapeYahooAuction(url);
        default:
          return await this.scrapeGeneric(url);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error({
        type: 'scrape_error',
        url,
        marketplace,
        error: errorMessage,
      });
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * eBayスクレイピング
   */
  private async scrapeEbay(url: string): Promise<ScrapeResult> {
    // 実際のスクレイピングはeBay APIを使用することを推奨
    // ここではデモ用の実装
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
        };
      }

      const html = await response.text();

      // 価格抽出（簡易版）
      const priceMatch = html.match(/itemprop="price" content="([\d.]+)"/);
      const currencyMatch = html.match(/itemprop="priceCurrency" content="(\w+)"/);
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);

      if (!priceMatch) {
        return {
          success: false,
          error: 'Price not found',
        };
      }

      return {
        success: true,
        price: parseFloat(priceMatch[1]),
        currency: currencyMatch?.[1] || 'USD',
        title: titleMatch?.[1]?.replace(' | eBay', '').trim(),
        stockStatus: html.includes('Out of stock') ? 'out_of_stock' : 'in_stock',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fetch failed',
      };
    }
  }

  /**
   * Amazonスクレイピング
   */
  private async scrapeAmazon(url: string): Promise<ScrapeResult> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
        };
      }

      const html = await response.text();

      // 価格抽出
      const priceMatch = html.match(/class="a-price-whole">([^<]+)</);
      const fractionMatch = html.match(/class="a-price-fraction">([^<]+)</);
      const titleMatch = html.match(/id="productTitle"[^>]*>([^<]+)</);

      if (!priceMatch) {
        return {
          success: false,
          error: 'Price not found',
        };
      }

      const price = parseFloat(
        priceMatch[1].replace(/[,\s]/g, '') +
        (fractionMatch ? '.' + fractionMatch[1] : '')
      );

      return {
        success: true,
        price,
        currency: 'USD',
        title: titleMatch?.[1]?.trim(),
        stockStatus: html.includes('Currently unavailable') ? 'out_of_stock' : 'in_stock',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fetch failed',
      };
    }
  }

  /**
   * メルカリスクレイピング
   */
  private async scrapeMercari(url: string): Promise<ScrapeResult> {
    // メルカリはAPI経由でアクセスすることを推奨
    // 直接スクレイピングは規約違反の可能性あり
    return {
      success: false,
      error: 'Mercari scraping requires API access',
    };
  }

  /**
   * ヤフオクスクレイピング
   */
  private async scrapeYahooAuction(url: string): Promise<ScrapeResult> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept-Language': 'ja,en;q=0.9',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
        };
      }

      const html = await response.text();

      // 現在価格抽出
      const priceMatch = html.match(/data-auction-price="(\d+)"/);
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);

      if (!priceMatch) {
        return {
          success: false,
          error: 'Price not found',
        };
      }

      return {
        success: true,
        price: parseInt(priceMatch[1], 10),
        currency: 'JPY',
        title: titleMatch?.[1]?.replace(' - ヤフオク!', '').trim(),
        stockStatus: html.includes('終了') ? 'out_of_stock' : 'in_stock',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fetch failed',
      };
    }
  }

  /**
   * 汎用スクレイピング
   */
  private async scrapeGeneric(url: string): Promise<ScrapeResult> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
        };
      }

      const html = await response.text();

      // JSON-LDから価格を抽出
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
      if (jsonLdMatch) {
        try {
          const jsonLd = JSON.parse(jsonLdMatch[1]);
          if (jsonLd.offers?.price) {
            return {
              success: true,
              price: parseFloat(jsonLd.offers.price),
              currency: jsonLd.offers.priceCurrency || 'USD',
              title: jsonLd.name,
              stockStatus: jsonLd.offers.availability?.includes('InStock') ? 'in_stock' : 'out_of_stock',
            };
          }
        } catch {
          // JSON解析失敗は無視
        }
      }

      // Open Graphから価格を抽出
      const ogPriceMatch = html.match(/<meta property="og:price:amount" content="([^"]+)"/);
      const ogCurrencyMatch = html.match(/<meta property="og:price:currency" content="([^"]+)"/);
      const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);

      if (ogPriceMatch) {
        return {
          success: true,
          price: parseFloat(ogPriceMatch[1]),
          currency: ogCurrencyMatch?.[1] || 'USD',
          title: ogTitleMatch?.[1],
        };
      }

      // 一般的な価格パターンを検索
      const pricePatterns = [
        /\$\s*([\d,]+(?:\.\d{2})?)/,
        /USD\s*([\d,]+(?:\.\d{2})?)/,
        /price['":\s]+([\d,]+(?:\.\d{2})?)/i,
      ];

      for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match) {
          return {
            success: true,
            price: parseFloat(match[1].replace(/,/g, '')),
            currency: 'USD',
          };
        }
      }

      return {
        success: false,
        error: 'Price not found',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fetch failed',
      };
    }
  }

  /**
   * ヘルスチェック（URLがアクセス可能か確認）
   */
  async healthCheck(url: string): Promise<{
    accessible: boolean;
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': this.config.userAgent,
        },
        signal: AbortSignal.timeout(10000),
      });

      return {
        accessible: response.ok,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        accessible: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// シングルトンインスタンス
export const competitorScraper = new CompetitorScraper();

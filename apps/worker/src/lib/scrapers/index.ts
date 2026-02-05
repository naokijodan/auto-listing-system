import { ScrapedProduct } from '@rakuda/schema';
import { scrapeMercari, scrapeMercariSeller } from './mercari';
import { scrapeYahooAuction, scrapeYahooAuctionSeller } from './yahoo-auction';
import { scrapePayPayFlea, scrapePayPayFleaSeller } from './paypay-flea';
import { scrapeRakuma, scrapeRakumaSeller } from './rakuma';
import { scrapeRakuten, scrapeRakutenShop } from './rakuten';
import { scrapeAmazon, scrapeAmazonSearch } from './amazon';

export type SourceType = 'mercari' | 'yahoo_auction' | 'yahoo_flea' | 'rakuma' | 'rakuten' | 'amazon';

export interface ScraperResult {
  success: boolean;
  product?: ScrapedProduct;
  products?: ScrapedProduct[];
  error?: string;
}

/**
 * URLから商品情報をスクレイピング
 */
export async function scrapeProduct(url: string, sourceType: SourceType): Promise<ScraperResult> {
  switch (sourceType) {
    case 'mercari':
      return scrapeMercari(url);
    case 'yahoo_auction':
      return scrapeYahooAuction(url);
    case 'yahoo_flea':
      return scrapePayPayFlea(url);
    case 'rakuma':
      return scrapeRakuma(url);
    case 'rakuten':
      return scrapeRakuten(url);
    case 'amazon':
      return scrapeAmazon(url);
    default:
      return { success: false, error: `Unknown source type: ${sourceType}` };
  }
}

/**
 * セラーページから商品一覧をスクレイピング
 */
export async function scrapeSellerProducts(
  url: string,
  sourceType: SourceType,
  limit: number = 50
): Promise<ScraperResult> {
  switch (sourceType) {
    case 'mercari':
      return scrapeMercariSeller(url, limit);
    case 'yahoo_auction':
      return scrapeYahooAuctionSeller(url, limit);
    case 'yahoo_flea':
      return scrapePayPayFleaSeller(url, limit);
    case 'rakuma':
      return scrapeRakumaSeller(url, limit);
    case 'rakuten':
      return scrapeRakutenShop(url, limit);
    case 'amazon':
      return scrapeAmazonSearch(url, limit);
    default:
      return { success: false, error: `Seller scraping not supported for: ${sourceType}` };
  }
}

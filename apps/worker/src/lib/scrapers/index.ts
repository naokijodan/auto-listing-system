import { ScrapedProduct } from '@als/schema';
import { scrapeMercari, scrapeMercariSeller } from './mercari';
import { scrapeYahooAuction, scrapeYahooAuctionSeller } from './yahoo-auction';

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
      // PayPayフリマ（TODO: 実装）
      return { success: false, error: 'yahoo_flea scraper not implemented yet' };
    case 'rakuma':
      // ラクマ（TODO: 実装）
      return { success: false, error: 'rakuma scraper not implemented yet' };
    case 'rakuten':
      // 楽天（TODO: 実装）
      return { success: false, error: 'rakuten scraper not implemented yet' };
    case 'amazon':
      // Amazon（TODO: 実装）
      return { success: false, error: 'amazon scraper not implemented yet' };
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
    default:
      return { success: false, error: `Seller scraping not supported for: ${sourceType}` };
  }
}

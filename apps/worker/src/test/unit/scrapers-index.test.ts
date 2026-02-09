import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const {
  mockScrapeMercari,
  mockScrapeMercariSeller,
  mockScrapeYahooAuction,
  mockScrapeYahooAuctionSeller,
  mockScrapePayPayFlea,
  mockScrapePayPayFleaSeller,
  mockScrapeRakuma,
  mockScrapeRakumaSeller,
  mockScrapeRakuten,
  mockScrapeRakutenShop,
  mockScrapeAmazon,
  mockScrapeAmazonSearch,
} = vi.hoisted(() => ({
  mockScrapeMercari: vi.fn(),
  mockScrapeMercariSeller: vi.fn(),
  mockScrapeYahooAuction: vi.fn(),
  mockScrapeYahooAuctionSeller: vi.fn(),
  mockScrapePayPayFlea: vi.fn(),
  mockScrapePayPayFleaSeller: vi.fn(),
  mockScrapeRakuma: vi.fn(),
  mockScrapeRakumaSeller: vi.fn(),
  mockScrapeRakuten: vi.fn(),
  mockScrapeRakutenShop: vi.fn(),
  mockScrapeAmazon: vi.fn(),
  mockScrapeAmazonSearch: vi.fn(),
}));

vi.mock('../../lib/scrapers/mercari', () => ({
  scrapeMercari: mockScrapeMercari,
  scrapeMercariSeller: mockScrapeMercariSeller,
}));

vi.mock('../../lib/scrapers/yahoo-auction', () => ({
  scrapeYahooAuction: mockScrapeYahooAuction,
  scrapeYahooAuctionSeller: mockScrapeYahooAuctionSeller,
}));

vi.mock('../../lib/scrapers/paypay-flea', () => ({
  scrapePayPayFlea: mockScrapePayPayFlea,
  scrapePayPayFleaSeller: mockScrapePayPayFleaSeller,
}));

vi.mock('../../lib/scrapers/rakuma', () => ({
  scrapeRakuma: mockScrapeRakuma,
  scrapeRakumaSeller: mockScrapeRakumaSeller,
}));

vi.mock('../../lib/scrapers/rakuten', () => ({
  scrapeRakuten: mockScrapeRakuten,
  scrapeRakutenShop: mockScrapeRakutenShop,
}));

vi.mock('../../lib/scrapers/amazon', () => ({
  scrapeAmazon: mockScrapeAmazon,
  scrapeAmazonSearch: mockScrapeAmazonSearch,
}));

import { scrapeProduct, scrapeSellerProducts, SourceType } from '../../lib/scrapers';

describe('Scrapers Index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('scrapeProduct', () => {
    it('should route mercari URLs correctly', async () => {
      const mockResult = { success: true, product: { title: 'Test Product' } };
      mockScrapeMercari.mockResolvedValueOnce(mockResult);

      const result = await scrapeProduct('https://mercari.com/item/123', 'mercari');

      expect(mockScrapeMercari).toHaveBeenCalledWith('https://mercari.com/item/123');
      expect(result).toEqual(mockResult);
    });

    it('should route yahoo_auction URLs correctly', async () => {
      const mockResult = { success: true, product: { title: 'Test Product' } };
      mockScrapeYahooAuction.mockResolvedValueOnce(mockResult);

      const result = await scrapeProduct('https://page.auctions.yahoo.co.jp/jp/123', 'yahoo_auction');

      expect(mockScrapeYahooAuction).toHaveBeenCalledWith('https://page.auctions.yahoo.co.jp/jp/123');
      expect(result).toEqual(mockResult);
    });

    it('should route yahoo_flea (PayPay Flea Market) URLs correctly', async () => {
      const mockResult = { success: true, product: { title: 'Test Product' } };
      mockScrapePayPayFlea.mockResolvedValueOnce(mockResult);

      const result = await scrapeProduct('https://paypayfleamarket.yahoo.co.jp/item/123', 'yahoo_flea');

      expect(mockScrapePayPayFlea).toHaveBeenCalledWith('https://paypayfleamarket.yahoo.co.jp/item/123');
      expect(result).toEqual(mockResult);
    });

    it('should route rakuma URLs correctly', async () => {
      const mockResult = { success: true, product: { title: 'Test Product' } };
      mockScrapeRakuma.mockResolvedValueOnce(mockResult);

      const result = await scrapeProduct('https://fril.jp/item/123', 'rakuma');

      expect(mockScrapeRakuma).toHaveBeenCalledWith('https://fril.jp/item/123');
      expect(result).toEqual(mockResult);
    });

    it('should route rakuten URLs correctly', async () => {
      const mockResult = { success: true, product: { title: 'Test Product' } };
      mockScrapeRakuten.mockResolvedValueOnce(mockResult);

      const result = await scrapeProduct('https://item.rakuten.co.jp/shop/item/', 'rakuten');

      expect(mockScrapeRakuten).toHaveBeenCalledWith('https://item.rakuten.co.jp/shop/item/');
      expect(result).toEqual(mockResult);
    });

    it('should route amazon URLs correctly', async () => {
      const mockResult = { success: true, product: { title: 'Test Product' } };
      mockScrapeAmazon.mockResolvedValueOnce(mockResult);

      const result = await scrapeProduct('https://www.amazon.co.jp/dp/B123456789', 'amazon');

      expect(mockScrapeAmazon).toHaveBeenCalledWith('https://www.amazon.co.jp/dp/B123456789');
      expect(result).toEqual(mockResult);
    });

    it('should return error for unknown source type', async () => {
      const result = await scrapeProduct('https://unknown.com/item', 'unknown' as SourceType);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown source type');
    });
  });

  describe('scrapeSellerProducts', () => {
    it('should route mercari seller URLs correctly', async () => {
      const mockResult = { success: true, products: [{ title: 'Product 1' }] };
      mockScrapeMercariSeller.mockResolvedValueOnce(mockResult);

      const result = await scrapeSellerProducts('https://mercari.com/seller/123', 'mercari', 50);

      expect(mockScrapeMercariSeller).toHaveBeenCalledWith('https://mercari.com/seller/123', 50);
      expect(result).toEqual(mockResult);
    });

    it('should route yahoo_auction seller URLs correctly', async () => {
      const mockResult = { success: true, products: [] };
      mockScrapeYahooAuctionSeller.mockResolvedValueOnce(mockResult);

      const result = await scrapeSellerProducts('https://auctions.yahoo.co.jp/seller/abc', 'yahoo_auction');

      expect(mockScrapeYahooAuctionSeller).toHaveBeenCalledWith('https://auctions.yahoo.co.jp/seller/abc', 50);
      expect(result).toEqual(mockResult);
    });

    it('should route yahoo_flea seller URLs correctly', async () => {
      const mockResult = { success: true, products: [] };
      mockScrapePayPayFleaSeller.mockResolvedValueOnce(mockResult);

      const result = await scrapeSellerProducts('https://paypayfleamarket.yahoo.co.jp/user/123', 'yahoo_flea', 30);

      expect(mockScrapePayPayFleaSeller).toHaveBeenCalledWith('https://paypayfleamarket.yahoo.co.jp/user/123', 30);
      expect(result).toEqual(mockResult);
    });

    it('should route rakuma seller URLs correctly', async () => {
      const mockResult = { success: true, products: [] };
      mockScrapeRakumaSeller.mockResolvedValueOnce(mockResult);

      const result = await scrapeSellerProducts('https://fril.jp/shop/123', 'rakuma', 25);

      expect(mockScrapeRakumaSeller).toHaveBeenCalledWith('https://fril.jp/shop/123', 25);
      expect(result).toEqual(mockResult);
    });

    it('should route rakuten shop URLs correctly', async () => {
      const mockResult = { success: true, products: [] };
      mockScrapeRakutenShop.mockResolvedValueOnce(mockResult);

      const result = await scrapeSellerProducts('https://www.rakuten.co.jp/shop/', 'rakuten', 100);

      expect(mockScrapeRakutenShop).toHaveBeenCalledWith('https://www.rakuten.co.jp/shop/', 100);
      expect(result).toEqual(mockResult);
    });

    it('should route amazon search URLs correctly', async () => {
      const mockResult = { success: true, products: [] };
      mockScrapeAmazonSearch.mockResolvedValueOnce(mockResult);

      const result = await scrapeSellerProducts('https://www.amazon.co.jp/s?k=keyword', 'amazon', 20);

      expect(mockScrapeAmazonSearch).toHaveBeenCalledWith('https://www.amazon.co.jp/s?k=keyword', 20);
      expect(result).toEqual(mockResult);
    });

    it('should return error for unknown source type', async () => {
      const result = await scrapeSellerProducts('https://unknown.com/seller', 'unknown' as SourceType);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('should use default limit of 50 when not specified', async () => {
      const mockResult = { success: true, products: [] };
      mockScrapeMercariSeller.mockResolvedValueOnce(mockResult);

      await scrapeSellerProducts('https://mercari.com/seller/123', 'mercari');

      expect(mockScrapeMercariSeller).toHaveBeenCalledWith('https://mercari.com/seller/123', 50);
    });
  });
});

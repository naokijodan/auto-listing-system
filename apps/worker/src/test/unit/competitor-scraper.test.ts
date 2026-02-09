import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock
const { mockFetch } = vi.hoisted(() => {
  return {
    mockFetch: vi.fn(),
  };
});

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Mock global fetch
const originalFetch = globalThis.fetch;

import { competitorScraper } from '../../lib/competitor/competitor-scraper';

describe('CompetitorScraper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('scrape', () => {
    describe('eBay', () => {
      it('should scrape eBay product successfully', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => `
            <html>
              <title>Test Product | eBay</title>
              <span itemprop="price" content="99.99"></span>
              <span itemprop="priceCurrency" content="USD"></span>
            </html>
          `,
        });

        const result = await competitorScraper.scrape('https://ebay.com/itm/123', 'ebay');

        expect(result.success).toBe(true);
        expect(result.price).toBe(99.99);
        expect(result.currency).toBe('USD');
        expect(result.title).toBe('Test Product');
      });

      it('should detect out of stock on eBay', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => `
            <html>
              <span itemprop="price" content="50.00"></span>
              <div>Out of stock</div>
            </html>
          `,
        });

        const result = await competitorScraper.scrape('https://ebay.com/itm/123', 'ebay');

        expect(result.success).toBe(true);
        expect(result.stockStatus).toBe('out_of_stock');
      });

      it('should return error when eBay price not found', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => '<html><body>No price here</body></html>',
        });

        const result = await competitorScraper.scrape('https://ebay.com/itm/123', 'ebay');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Price not found');
      });

      it('should handle HTTP errors', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 404,
        });

        const result = await competitorScraper.scrape('https://ebay.com/itm/123', 'ebay');

        expect(result.success).toBe(false);
        expect(result.error).toBe('HTTP 404');
      });

      it('should handle fetch errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const result = await competitorScraper.scrape('https://ebay.com/itm/123', 'ebay');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Network error');
      });
    });

    describe('Amazon', () => {
      it('should scrape Amazon product successfully', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => `
            <html>
              <span id="productTitle" class="">Test Amazon Product</span>
              <span class="a-price-whole">149</span>
              <span class="a-price-fraction">99</span>
            </html>
          `,
        });

        const result = await competitorScraper.scrape('https://amazon.com/dp/B123', 'amazon');

        expect(result.success).toBe(true);
        expect(result.price).toBe(149.99);
        expect(result.currency).toBe('USD');
      });

      it('should detect unavailable on Amazon', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => `
            <html>
              <span class="a-price-whole">50</span>
              <div>Currently unavailable</div>
            </html>
          `,
        });

        const result = await competitorScraper.scrape('https://amazon.com/dp/B123', 'amazon');

        expect(result.success).toBe(true);
        expect(result.stockStatus).toBe('out_of_stock');
      });

      it('should return error when Amazon price not found', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => '<html><body>No price</body></html>',
        });

        const result = await competitorScraper.scrape('https://amazon.com/dp/B123', 'amazon');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Price not found');
      });
    });

    describe('Mercari', () => {
      it('should return API required error for Mercari', async () => {
        const result = await competitorScraper.scrape('https://mercari.com/item/123', 'mercari');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Mercari scraping requires API access');
      });
    });

    describe('Yahoo Auction', () => {
      it('should scrape Yahoo Auction product successfully', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => `
            <html>
              <title>Test Yahoo Product - ヤフオク!</title>
              <div data-auction-price="15000"></div>
            </html>
          `,
        });

        const result = await competitorScraper.scrape('https://page.auctions.yahoo.co.jp/123', 'yahoo_auction');

        expect(result.success).toBe(true);
        expect(result.price).toBe(15000);
        expect(result.currency).toBe('JPY');
        expect(result.title).toBe('Test Yahoo Product');
      });

      it('should also accept "yahoo" as marketplace', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => `
            <html>
              <div data-auction-price="5000"></div>
            </html>
          `,
        });

        const result = await competitorScraper.scrape('https://page.auctions.yahoo.co.jp/123', 'yahoo');

        expect(result.success).toBe(true);
        expect(result.price).toBe(5000);
      });

      it('should detect ended auction', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => `
            <html>
              <div data-auction-price="10000"></div>
              <span>終了</span>
            </html>
          `,
        });

        const result = await competitorScraper.scrape('https://page.auctions.yahoo.co.jp/123', 'yahoo_auction');

        expect(result.success).toBe(true);
        expect(result.stockStatus).toBe('out_of_stock');
      });
    });

    describe('Generic', () => {
      it('should extract price from JSON-LD', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => `
            <html>
              <script type="application/ld+json">
                {"@type": "Product", "name": "Test", "offers": {"price": "75.50", "priceCurrency": "EUR", "availability": "InStock"}}
              </script>
            </html>
          `,
        });

        const result = await competitorScraper.scrape('https://example.com/product', 'other');

        expect(result.success).toBe(true);
        expect(result.price).toBe(75.5);
        expect(result.currency).toBe('EUR');
        expect(result.title).toBe('Test');
        expect(result.stockStatus).toBe('in_stock');
      });

      it('should extract price from Open Graph', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => `
            <html>
              <meta property="og:title" content="OG Product">
              <meta property="og:price:amount" content="45.00">
              <meta property="og:price:currency" content="GBP">
            </html>
          `,
        });

        const result = await competitorScraper.scrape('https://example.com/product', 'other');

        expect(result.success).toBe(true);
        expect(result.price).toBe(45);
        expect(result.currency).toBe('GBP');
        expect(result.title).toBe('OG Product');
      });

      it('should extract price from dollar pattern', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => '<html><body>Price: $29.99</body></html>',
        });

        const result = await competitorScraper.scrape('https://example.com/product', 'other');

        expect(result.success).toBe(true);
        expect(result.price).toBe(29.99);
        expect(result.currency).toBe('USD');
      });

      it('should extract price from USD pattern', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => '<html><body>USD 199.00</body></html>',
        });

        const result = await competitorScraper.scrape('https://example.com/product', 'other');

        expect(result.success).toBe(true);
        expect(result.price).toBe(199);
      });

      it('should extract price from price keyword pattern', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => '<html><body>price: 55.00</body></html>',
        });

        const result = await competitorScraper.scrape('https://example.com/product', 'other');

        expect(result.success).toBe(true);
        expect(result.price).toBe(55);
      });

      it('should return error when no price found', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => '<html><body>No price information</body></html>',
        });

        const result = await competitorScraper.scrape('https://example.com/product', 'other');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Price not found');
      });

      it('should handle invalid JSON-LD gracefully', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          text: async () => `
            <html>
              <script type="application/ld+json">
                {invalid json}
              </script>
              <body>Price: $10.00</body>
            </html>
          `,
        });

        const result = await competitorScraper.scrape('https://example.com/product', 'other');

        // Should fall back to other patterns
        expect(result.success).toBe(true);
        expect(result.price).toBe(10);
      });
    });

    describe('error handling', () => {
      it('should handle general scrape errors', async () => {
        mockFetch.mockRejectedValue(new Error('Connection refused'));

        const result = await competitorScraper.scrape('https://example.com', 'unknown');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Connection refused');
      });

      it('should handle non-Error exceptions', async () => {
        mockFetch.mockRejectedValue('String error');

        const result = await competitorScraper.scrape('https://example.com', 'unknown');

        expect(result.success).toBe(false);
        // The generic scraper returns 'Fetch failed' for non-Error exceptions
        expect(result.error).toBe('Fetch failed');
      });
    });
  });

  describe('healthCheck', () => {
    it('should return accessible true for valid URL', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await competitorScraper.healthCheck('https://example.com');

      expect(result.accessible).toBe(true);
      expect(result.responseTime).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should return accessible false for HTTP error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const result = await competitorScraper.healthCheck('https://example.com');

      expect(result.accessible).toBe(false);
      expect(result.responseTime).toBeDefined();
    });

    it('should return error on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('DNS lookup failed'));

      const result = await competitorScraper.healthCheck('https://example.com');

      expect(result.accessible).toBe(false);
      expect(result.error).toBe('DNS lookup failed');
      expect(result.responseTime).toBeDefined();
    });

    it('should use HEAD method for health check', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await competitorScraper.healthCheck('https://example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          method: 'HEAD',
        })
      );
    });
  });

  describe('marketplace routing', () => {
    it('should route to correct scraper based on marketplace', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '<span itemprop="price" content="100"></span>',
      });

      await competitorScraper.scrape('https://test.com', 'EBAY'); // uppercase

      expect(mockFetch).toHaveBeenCalled();
    });
  });
});

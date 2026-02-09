import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock functions
const { mockLaunch, mockNewPage, mockClose, mockSetUserAgent, mockSetViewport, mockSetRequestInterception } = vi.hoisted(() => ({
  mockLaunch: vi.fn(),
  mockNewPage: vi.fn(),
  mockClose: vi.fn(),
  mockSetUserAgent: vi.fn(),
  mockSetViewport: vi.fn(),
  mockSetRequestInterception: vi.fn(),
}));

vi.mock('puppeteer', () => ({
  default: {
    launch: mockLaunch,
  },
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Puppeteer Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('randomDelay', () => {
    it('should return a promise that resolves', async () => {
      const { randomDelay } = await import('../../lib/puppeteer');

      const start = Date.now();
      await randomDelay(10, 20);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(10);
      expect(elapsed).toBeLessThan(100); // Allow some margin
    });

    it('should delay within specified range', async () => {
      const { randomDelay } = await import('../../lib/puppeteer');

      const start = Date.now();
      await randomDelay(50, 100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(50);
    });
  });

  describe('getBrowser', () => {
    it('should launch browser with default args', async () => {
      const mockBrowser = {
        connected: true,
        newPage: mockNewPage,
        close: mockClose,
      };
      mockLaunch.mockResolvedValueOnce(mockBrowser);

      const { getBrowser } = await import('../../lib/puppeteer');

      const browser = await getBrowser();

      expect(mockLaunch).toHaveBeenCalledWith({
        headless: true,
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ]),
      });
      expect(browser).toBe(mockBrowser);
    });

    it('should include proxy when PROXY_URL is set', async () => {
      process.env.PROXY_URL = 'http://proxy.example.com:8080';

      const mockBrowser = {
        connected: true,
        newPage: mockNewPage,
        close: mockClose,
      };
      mockLaunch.mockResolvedValueOnce(mockBrowser);

      const { getBrowser } = await import('../../lib/puppeteer');

      await getBrowser();

      expect(mockLaunch).toHaveBeenCalledWith({
        headless: true,
        args: expect.arrayContaining([
          '--proxy-server=http://proxy.example.com:8080',
        ]),
      });
    });

    it('should return existing browser if connected', async () => {
      const mockBrowser = {
        connected: true,
        newPage: mockNewPage,
        close: mockClose,
      };
      mockLaunch.mockResolvedValueOnce(mockBrowser);

      const { getBrowser } = await import('../../lib/puppeteer');

      const browser1 = await getBrowser();
      const browser2 = await getBrowser();

      expect(mockLaunch).toHaveBeenCalledTimes(1);
      expect(browser1).toBe(browser2);
    });
  });

  describe('createPage', () => {
    it('should create page with user agent and viewport', async () => {
      const mockPage = {
        setUserAgent: mockSetUserAgent,
        setViewport: mockSetViewport,
        setRequestInterception: mockSetRequestInterception,
        on: vi.fn(),
      };
      const mockBrowser = {
        connected: true,
        newPage: mockNewPage.mockResolvedValueOnce(mockPage),
        close: mockClose,
      };
      mockLaunch.mockResolvedValueOnce(mockBrowser);

      const { createPage } = await import('../../lib/puppeteer');

      const page = await createPage();

      expect(mockSetUserAgent).toHaveBeenCalled();
      expect(mockSetViewport).toHaveBeenCalledWith({ width: 1920, height: 1080 });
      expect(mockSetRequestInterception).toHaveBeenCalledWith(true);
      expect(page).toBe(mockPage);
    });

    it('should set up request interception', async () => {
      const mockPage = {
        setUserAgent: mockSetUserAgent,
        setViewport: mockSetViewport,
        setRequestInterception: mockSetRequestInterception,
        on: vi.fn(),
      };
      const mockBrowser = {
        connected: true,
        newPage: mockNewPage.mockResolvedValueOnce(mockPage),
        close: mockClose,
      };
      mockLaunch.mockResolvedValueOnce(mockBrowser);

      const { createPage } = await import('../../lib/puppeteer');

      await createPage();

      expect(mockPage.on).toHaveBeenCalledWith('request', expect.any(Function));
    });
  });

  describe('closeBrowser', () => {
    it('should close browser when open', async () => {
      const mockBrowser = {
        connected: true,
        newPage: mockNewPage,
        close: mockClose.mockResolvedValueOnce(undefined),
      };
      mockLaunch.mockResolvedValueOnce(mockBrowser);

      const { getBrowser, closeBrowser } = await import('../../lib/puppeteer');

      await getBrowser();
      await closeBrowser();

      expect(mockClose).toHaveBeenCalled();
    });

    it('should not throw when no browser is open', async () => {
      const { closeBrowser } = await import('../../lib/puppeteer');

      await expect(closeBrowser()).resolves.not.toThrow();
    });
  });
});

import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '@als/logger';

let browser: Browser | null = null;

const PROXY_URL = process.env.PROXY_URL || '';

/**
 * ブラウザインスタンスを取得（シングルトン）
 */
export async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) {
    return browser;
  }

  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920,1080',
  ];

  // プロキシ設定
  if (PROXY_URL) {
    args.push(`--proxy-server=${PROXY_URL}`);
  }

  browser = await puppeteer.launch({
    headless: true,
    args,
  });

  logger.info({ type: 'browser_launched', proxy: !!PROXY_URL });

  return browser;
}

/**
 * 新しいページを作成
 */
export async function createPage(): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  // User-Agent設定
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // ビューポート設定
  await page.setViewport({ width: 1920, height: 1080 });

  // 不要なリソースをブロック
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const resourceType = request.resourceType();
    if (['font', 'media'].includes(resourceType)) {
      request.abort();
    } else {
      request.continue();
    }
  });

  return page;
}

/**
 * ブラウザを閉じる
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    logger.info({ type: 'browser_closed' });
  }
}

/**
 * ランダム遅延（Ban対策）
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

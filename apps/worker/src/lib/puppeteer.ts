import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { logger } from '@rakuda/logger';

// Enable stealth plugin once at module init
puppeteer.use(StealthPlugin());

let browser: Browser | null = null;

const PROXY_URL = process.env.PROXY_URL || '';
const PROXY_USERNAME = process.env.PROXY_USERNAME || '';
const PROXY_PASSWORD = process.env.PROXY_PASSWORD || '';
const BROWSER_PROFILE_DIR = process.env.BROWSER_PROFILE_DIR || '/tmp/rakuda-browser-profile';

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1366, height: 768 },
  { width: 1600, height: 900 },
];

/**
 * ブラウザインスタンスを取得（シングルトン）
 */
export async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) {
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

  browser = (await puppeteer.launch({
    headless: true,
    args,
    userDataDir: BROWSER_PROFILE_DIR,
  })) as unknown as Browser;

  logger.info({ type: 'browser_launched', proxy: !!PROXY_URL, profileDir: BROWSER_PROFILE_DIR });

  return browser;
}

/**
 * 新しいページを作成
 */
export async function createPage(): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  // プロキシ認証（PROXY_URLに認証が含まれていない場合）
  if (PROXY_URL) {
    let hasAuthInUrl = false;
    try {
      const u = new URL(PROXY_URL);
      hasAuthInUrl = Boolean(u.username && u.password);
    } catch {
      hasAuthInUrl = false;
    }
    if (!hasAuthInUrl && PROXY_USERNAME && PROXY_PASSWORD) {
      await page.authenticate({ username: PROXY_USERNAME, password: PROXY_PASSWORD });
    }
  }

  // User-Agentのローテーション
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  await page.setUserAgent(ua);

  // ビューポートをランダム化
  const vp = viewports[Math.floor(Math.random() * viewports.length)];
  await page.setViewport(vp);

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

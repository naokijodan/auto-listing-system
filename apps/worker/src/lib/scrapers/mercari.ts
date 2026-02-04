import { logger } from '@als/logger';
import { ScrapedProduct } from '@als/schema';
import { createPage, randomDelay } from '../puppeteer';
import { ScraperResult } from './index';

/**
 * メルカリ商品ページをスクレイピング
 */
export async function scrapeMercari(url: string): Promise<ScraperResult> {
  const log = logger.child({ scraper: 'mercari', url });
  let page = null;

  try {
    // 商品IDを抽出
    const itemIdMatch = url.match(/item\/([a-zA-Z0-9]+)/);
    if (!itemIdMatch) {
      return { success: false, error: 'Invalid Mercari URL' };
    }
    const itemId = itemIdMatch[1];

    log.info({ type: 'scrape_start', itemId });

    page = await createPage();
    await randomDelay(1000, 3000);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(500, 1500);

    // ページコンテンツを取得
    const productData = await page.evaluate(() => {
      // タイトル
      const titleEl = document.querySelector('[data-testid="item-name"]') ||
                      document.querySelector('h1') ||
                      document.querySelector('.item-name');
      const title = titleEl?.textContent?.trim() || '';

      // 価格
      const priceEl = document.querySelector('[data-testid="item-price"]') ||
                      document.querySelector('.price') ||
                      document.querySelector('[class*="Price"]');
      const priceText = priceEl?.textContent?.trim() || '0';
      const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || 0;

      // 説明文
      const descEl = document.querySelector('[data-testid="item-description"]') ||
                     document.querySelector('.item-description') ||
                     document.querySelector('[class*="Description"]');
      const description = descEl?.textContent?.trim() || '';

      // 画像
      const imageEls = document.querySelectorAll('[data-testid="image-0"], [data-testid="image-1"], [data-testid="image-2"], [data-testid="image-3"], img[src*="static.mercdn.net"]');
      const images: string[] = [];
      imageEls.forEach((img) => {
        const src = (img as HTMLImageElement).src || img.getAttribute('data-src') || '';
        if (src && src.includes('mercdn.net') && !images.includes(src)) {
          // 高解像度版に変換
          const highRes = src.replace(/\?.*$/, '').replace(/\/thumb\//, '/');
          images.push(highRes);
        }
      });

      // カテゴリ
      const categoryEls = document.querySelectorAll('[data-testid="category-link"], .item-category a');
      const categories: string[] = [];
      categoryEls.forEach((el) => {
        const cat = el.textContent?.trim();
        if (cat) categories.push(cat);
      });
      const category = categories.join(' > ');

      // ブランド
      const brandEl = document.querySelector('[data-testid="brand-name"], .item-brand');
      const brand = brandEl?.textContent?.trim() || null;

      // 商品の状態
      const conditionEl = document.querySelector('[data-testid="item-condition"], .item-condition');
      const condition = conditionEl?.textContent?.trim() || null;

      // セラー情報
      const sellerEl = document.querySelector('[data-testid="seller-name"], .seller-name a');
      const sellerName = sellerEl?.textContent?.trim() || null;
      const sellerLink = sellerEl?.getAttribute('href') || '';
      const sellerIdMatch = sellerLink.match(/\/user\/profile\/(\d+)/);
      const sellerId = sellerIdMatch ? sellerIdMatch[1] : null;

      // 在庫状況
      const soldEl = document.querySelector('[data-testid="sold-out"], .item-sold-out-badge');
      const isAvailable = !soldEl;

      return {
        title,
        price,
        description,
        images,
        category,
        brand,
        condition,
        sellerName,
        sellerId,
        isAvailable,
      };
    });

    if (!productData.title) {
      log.warn({ type: 'scrape_no_title' });
      return { success: false, error: 'Could not extract product title' };
    }

    const product: ScrapedProduct = {
      sourceType: 'mercari',
      sourceItemId: itemId,
      sourceUrl: url,
      title: productData.title,
      description: productData.description,
      price: productData.price,
      images: productData.images.slice(0, 10), // 最大10枚
      category: productData.category || undefined,
      brand: productData.brand || undefined,
      condition: productData.condition || undefined,
      sellerId: productData.sellerId || undefined,
      sellerName: productData.sellerName || undefined,
      isAvailable: productData.isAvailable,
    };

    log.info({
      type: 'scrape_success',
      itemId,
      title: product.title.substring(0, 50),
      price: product.price,
      imageCount: product.images.length,
    });

    return { success: true, product };
  } catch (error: any) {
    log.error({ type: 'scrape_error', error: error.message });
    return { success: false, error: error.message };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * メルカリセラーページから商品一覧をスクレイピング
 */
export async function scrapeMercariSeller(url: string, limit: number = 50): Promise<ScraperResult> {
  const log = logger.child({ scraper: 'mercari_seller', url, limit });
  let page = null;

  try {
    // セラーIDを抽出
    const sellerIdMatch = url.match(/profile\/(\d+)/);
    if (!sellerIdMatch) {
      return { success: false, error: 'Invalid Mercari seller URL' };
    }
    const sellerId = sellerIdMatch[1];

    log.info({ type: 'scrape_seller_start', sellerId });

    page = await createPage();
    await randomDelay(1000, 3000);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(1000, 2000);

    // 商品リンクを収集
    const productUrls = await page.evaluate((maxItems: number) => {
      const links: string[] = [];
      const itemEls = document.querySelectorAll('a[href*="/item/"]');

      itemEls.forEach((el) => {
        if (links.length >= maxItems) return;
        const href = el.getAttribute('href');
        if (href && href.includes('/item/') && !links.includes(href)) {
          const fullUrl = href.startsWith('http') ? href : `https://jp.mercari.com${href}`;
          links.push(fullUrl);
        }
      });

      return links;
    }, limit);

    log.info({ type: 'found_products', count: productUrls.length });

    // 各商品をスクレイピング
    const products: ScrapedProduct[] = [];
    for (const productUrl of productUrls) {
      await randomDelay(2000, 5000); // Ban対策
      const result = await scrapeMercari(productUrl);
      if (result.success && result.product) {
        products.push(result.product);
      }
    }

    log.info({ type: 'scrape_seller_complete', total: products.length });

    return { success: true, products };
  } catch (error: any) {
    log.error({ type: 'scrape_seller_error', error: error.message });
    return { success: false, error: error.message };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

import { logger } from '@rakuda/logger';
import { ScrapedProduct } from '@rakuda/schema';
import { createPage, randomDelay } from '../puppeteer';
import { ScraperResult } from './index';

/**
 * PayPayフリマ商品ページをスクレイピング
 */
export async function scrapePayPayFlea(url: string): Promise<ScraperResult> {
  const log = logger.child({ scraper: 'paypay_flea', url });
  let page = null;

  try {
    // 商品IDを抽出
    const itemIdMatch = url.match(/item\/([a-zA-Z0-9]+)/);
    if (!itemIdMatch) {
      return { success: false, error: 'Invalid PayPay Flea Market URL' };
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
      const titleEl = document.querySelector('h1[class*="ItemTitle"]') ||
                      document.querySelector('[data-testid="item-name"]') ||
                      document.querySelector('h1');
      const title = titleEl?.textContent?.trim() || '';

      // 価格
      const priceEl = document.querySelector('[class*="ItemPrice"]') ||
                      document.querySelector('[data-testid="price"]') ||
                      document.querySelector('.price');
      const priceText = priceEl?.textContent?.trim() || '0';
      const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || 0;

      // 説明文
      const descEl = document.querySelector('[class*="ItemDescription"]') ||
                     document.querySelector('[data-testid="description"]') ||
                     document.querySelector('.description');
      const description = descEl?.textContent?.trim() || '';

      // 画像
      const imageEls = document.querySelectorAll('img[src*="auctions.c.yimg.jp"], img[src*="item-shopping.c.yimg.jp"], [class*="ItemImage"] img');
      const images: string[] = [];
      imageEls.forEach((img) => {
        const src = (img as HTMLImageElement).src || img.getAttribute('data-src') || '';
        if (src && (src.includes('yimg.jp') || src.includes('paypay')) && !images.includes(src)) {
          // 高解像度版に変換
          const highRes = src.replace(/\/s\//, '/').replace(/\?.*$/, '');
          images.push(highRes);
        }
      });

      // カテゴリ
      const categoryEls = document.querySelectorAll('[class*="Breadcrumb"] a, .breadcrumb a');
      const categories: string[] = [];
      categoryEls.forEach((el) => {
        const cat = el.textContent?.trim();
        if (cat && cat !== 'PayPayフリマ') categories.push(cat);
      });
      const category = categories.join(' > ');

      // ブランド
      const brandEl = document.querySelector('[class*="Brand"]') ||
                      document.querySelector('[data-testid="brand"]');
      const brand = brandEl?.textContent?.trim() || null;

      // 商品の状態
      const conditionEl = document.querySelector('[class*="Condition"]') ||
                          document.querySelector('[data-testid="condition"]');
      const condition = conditionEl?.textContent?.trim() || null;

      // セラー情報
      const sellerEl = document.querySelector('[class*="SellerName"] a, [data-testid="seller-name"]');
      const sellerName = sellerEl?.textContent?.trim() || null;
      const sellerLink = sellerEl?.getAttribute('href') || '';
      const sellerIdMatch = sellerLink.match(/seller\/([^/\?]+)/);
      const sellerId = sellerIdMatch ? sellerIdMatch[1] : null;

      // 在庫状況（売り切れ表示の有無）
      const soldEl = document.querySelector('[class*="SoldOut"], [class*="sold"]');
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
      sourceType: 'YAHOO_FLEA',
      sourceItemId: itemId,
      sourceUrl: url,
      title: productData.title,
      description: productData.description,
      price: productData.price,
      images: productData.images.slice(0, 10),
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
 * PayPayフリマセラーページから商品一覧をスクレイピング
 */
export async function scrapePayPayFleaSeller(url: string, limit: number = 50): Promise<ScraperResult> {
  const log = logger.child({ scraper: 'paypay_flea_seller', url, limit });
  let page = null;

  try {
    log.info({ type: 'scrape_seller_start' });

    page = await createPage();
    await randomDelay(1000, 3000);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(1000, 2000);

    // スクロールして商品を読み込み
    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 10;

    while (scrollAttempts < maxScrollAttempts) {
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      if (currentHeight === previousHeight) break;

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await randomDelay(1000, 2000);
      previousHeight = currentHeight;
      scrollAttempts++;
    }

    // 商品リンクを収集
    const productUrls = await page.evaluate((maxItems: number) => {
      const links: string[] = [];
      const itemEls = document.querySelectorAll('a[href*="/item/"]');

      itemEls.forEach((el) => {
        if (links.length >= maxItems) return;
        const href = el.getAttribute('href');
        if (href && href.includes('/item/') && !links.includes(href)) {
          const fullUrl = href.startsWith('http') ? href : `https://paypayfleamarket.yahoo.co.jp${href}`;
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
      const result = await scrapePayPayFlea(productUrl);
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

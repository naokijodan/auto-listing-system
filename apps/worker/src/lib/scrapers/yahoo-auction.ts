import { logger } from '@rakuda/logger';
import { ScrapedProduct } from '@rakuda/schema';
import { createPage, randomDelay } from '../puppeteer';
import { ScraperResult } from './index';

/**
 * ヤフオク商品ページをスクレイピング
 */
export async function scrapeYahooAuction(url: string): Promise<ScraperResult> {
  const log = logger.child({ scraper: 'yahoo_auction', url });
  let page = null;

  try {
    // 商品IDを抽出
    const itemIdMatch = url.match(/auction\/([a-zA-Z0-9]+)/);
    if (!itemIdMatch) {
      return { success: false, error: 'Invalid Yahoo Auction URL' };
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
      const titleEl = document.querySelector('.ProductTitle__text') ||
                      document.querySelector('h1.Product__title') ||
                      document.querySelector('h1');
      const title = titleEl?.textContent?.trim() || '';

      // 価格（現在価格 or 即決価格）
      const priceEl = document.querySelector('.Price__value') ||
                      document.querySelector('.ProductPrice__price') ||
                      document.querySelector('[class*="price"]');
      const priceText = priceEl?.textContent?.trim() || '0';
      const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || 0;

      // 即決価格
      const buyNowEl = document.querySelector('.Price__buyNowPrice .Price__value');
      const buyNowText = buyNowEl?.textContent?.trim() || '';
      const buyNowPrice = parseInt(buyNowText.replace(/[^0-9]/g, ''), 10) || null;

      // 説明文
      const descEl = document.querySelector('.ProductExplanation__body') ||
                     document.querySelector('.ProductDetail__description');
      const description = descEl?.textContent?.trim() || '';

      // 画像
      const imageEls = document.querySelectorAll('.ProductImage__image img, .ProductImageList img');
      const images: string[] = [];
      imageEls.forEach((img) => {
        const src = (img as HTMLImageElement).src || img.getAttribute('data-src') || '';
        if (src && !images.includes(src)) {
          // 高解像度版に変換
          const highRes = src.replace(/\/s-/, '/').replace(/\?.*$/, '');
          images.push(highRes);
        }
      });

      // カテゴリ
      const categoryEls = document.querySelectorAll('.CategoryPath a, .Breadcrumb a');
      const categories: string[] = [];
      categoryEls.forEach((el) => {
        const cat = el.textContent?.trim();
        if (cat && cat !== 'ホーム') categories.push(cat);
      });
      const category = categories.join(' > ');

      // 商品の状態
      const conditionEl = document.querySelector('.ProductCondition__text') ||
                          document.querySelector('[class*="condition"]');
      const condition = conditionEl?.textContent?.trim() || null;

      // セラー情報
      const sellerEl = document.querySelector('.Seller__name a') ||
                       document.querySelector('.sellerInfo a');
      const sellerName = sellerEl?.textContent?.trim() || null;
      const sellerLink = sellerEl?.getAttribute('href') || '';
      const sellerIdMatch = sellerLink.match(/seller\/([^/?]+)/);
      const sellerId = sellerIdMatch ? sellerIdMatch[1] : null;

      // 残り時間（終了チェック）
      const endedEl = document.querySelector('.ProductAuction--ended') ||
                      document.querySelector('[class*="ended"]');
      const isAvailable = !endedEl;

      return {
        title,
        price,
        buyNowPrice,
        description,
        images,
        category,
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

    // 即決価格があればそちらを使用
    const finalPrice = productData.buyNowPrice || productData.price;

    const product: ScrapedProduct = {
      sourceType: 'YAHOO_AUCTION',
      sourceItemId: itemId,
      sourceUrl: url,
      title: productData.title,
      description: productData.description,
      price: finalPrice,
      images: productData.images.slice(0, 10),
      category: productData.category || undefined,
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
 * ヤフオクセラーページから商品一覧をスクレイピング
 */
export async function scrapeYahooAuctionSeller(url: string, limit: number = 50): Promise<ScraperResult> {
  const log = logger.child({ scraper: 'yahoo_auction_seller', url, limit });
  let page = null;

  try {
    log.info({ type: 'scrape_seller_start' });

    page = await createPage();
    await randomDelay(1000, 3000);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(1000, 2000);

    // 商品リンクを収集
    const productUrls = await page.evaluate((maxItems: number) => {
      const links: string[] = [];
      const itemEls = document.querySelectorAll('a[href*="/auction/"]');

      itemEls.forEach((el) => {
        if (links.length >= maxItems) return;
        const href = el.getAttribute('href');
        if (href && href.includes('/auction/') && !links.includes(href)) {
          const fullUrl = href.startsWith('http') ? href : `https://auctions.yahoo.co.jp${href}`;
          links.push(fullUrl);
        }
      });

      return links;
    }, limit);

    log.info({ type: 'found_products', count: productUrls.length });

    // 各商品をスクレイピング
    const products: ScrapedProduct[] = [];
    for (const productUrl of productUrls) {
      await randomDelay(2000, 5000);
      const result = await scrapeYahooAuction(productUrl);
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

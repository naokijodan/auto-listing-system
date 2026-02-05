import { logger } from '@rakuda/logger';
import { ScrapedProduct } from '@rakuda/schema';
import { createPage, randomDelay } from '../puppeteer';
import { ScraperResult } from './index';

/**
 * 楽天商品ページをスクレイピング
 */
export async function scrapeRakuten(url: string): Promise<ScraperResult> {
  const log = logger.child({ scraper: 'rakuten', url });
  let page = null;

  try {
    // 商品IDを抽出（楽天市場のURLパターン）
    // 例: https://item.rakuten.co.jp/shop-name/item-code/
    const itemIdMatch = url.match(/item\.rakuten\.co\.jp\/([^\/]+)\/([^\/\?]+)/);
    if (!itemIdMatch) {
      return { success: false, error: 'Invalid Rakuten URL' };
    }
    const shopId = itemIdMatch[1];
    const itemId = itemIdMatch[2];

    log.info({ type: 'scrape_start', shopId, itemId });

    page = await createPage();
    await randomDelay(1000, 3000);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(500, 1500);

    // ページコンテンツを取得
    const productData = await page.evaluate(() => {
      // タイトル
      const titleEl = document.querySelector('.item_name') ||
                      document.querySelector('[itemprop="name"]') ||
                      document.querySelector('h1');
      const title = titleEl?.textContent?.trim() || '';

      // 価格
      const priceEl = document.querySelector('.price2') ||
                      document.querySelector('[itemprop="price"]') ||
                      document.querySelector('.price') ||
                      document.querySelector('.item_price');
      const priceText = priceEl?.textContent?.trim() || '0';
      const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || 0;

      // 説明文
      const descEl = document.querySelector('[itemprop="description"]') ||
                     document.querySelector('.item_desc') ||
                     document.querySelector('.caption');
      const description = descEl?.textContent?.trim() || '';

      // 画像
      const imageEls = document.querySelectorAll(
        '.rakutenLimitedId_ImageMain1-3 img, ' +
        '[itemprop="image"], ' +
        '.image_main img, ' +
        '#imageUrl_photo img'
      );
      const images: string[] = [];
      imageEls.forEach((img) => {
        const src = (img as HTMLImageElement).src ||
                    img.getAttribute('data-src') ||
                    img.getAttribute('data-original') || '';
        if (src && !images.includes(src) && !src.includes('blank')) {
          // 大きいサイズに変換
          const largeSrc = src.replace(/_ex=\d+x\d+/, '_ex=500x500');
          images.push(largeSrc);
        }
      });

      // カテゴリ（パンくずリスト）
      const breadcrumbEls = document.querySelectorAll('.sdtext a, .breadcrumb a, [itemprop="itemListElement"] a');
      const categories: string[] = [];
      breadcrumbEls.forEach((el) => {
        const cat = el.textContent?.trim();
        if (cat && cat !== 'トップ' && cat !== 'ホーム') {
          categories.push(cat);
        }
      });
      const category = categories.join(' > ');

      // ブランド
      const brandEl = document.querySelector('[itemprop="brand"]') ||
                      document.querySelector('.brand_name');
      const brand = brandEl?.textContent?.trim() || null;

      // ショップ名（セラー）
      const shopEl = document.querySelector('.shopName') ||
                     document.querySelector('.shop_name a') ||
                     document.querySelector('[itemprop="seller"] [itemprop="name"]');
      const sellerName = shopEl?.textContent?.trim() || null;

      // 在庫状況
      const soldOutEl = document.querySelector('.soldout_sign') ||
                        document.querySelector('.soldout') ||
                        document.querySelector('[data-soldout="true"]');
      const stockText = document.body.innerHTML.includes('売り切れ') ||
                        document.body.innerHTML.includes('在庫切れ') ||
                        document.body.innerHTML.includes('SOLD OUT');
      const isAvailable = !soldOutEl && !stockText;

      // レビュー数
      const reviewEl = document.querySelector('.review_num') ||
                       document.querySelector('[itemprop="reviewCount"]');
      const reviewCount = reviewEl ? parseInt(reviewEl.textContent || '0', 10) : null;

      return {
        title,
        price,
        description,
        images,
        category,
        brand,
        sellerName,
        isAvailable,
        reviewCount,
      };
    });

    if (!productData.title) {
      log.warn({ type: 'scrape_no_title' });
      return { success: false, error: 'Could not extract product title' };
    }

    const product: ScrapedProduct = {
      sourceUrl: url,
      sourceType: 'rakuten',
      sourceId: `${shopId}:${itemId}`,
      title: productData.title,
      price: productData.price,
      currency: 'JPY',
      description: productData.description,
      images: productData.images,
      category: productData.category || undefined,
      brand: productData.brand || undefined,
      seller: productData.sellerName ? {
        id: shopId,
        name: productData.sellerName,
      } : undefined,
      isAvailable: productData.isAvailable,
      scrapedAt: new Date().toISOString(),
    };

    log.info({
      type: 'scrape_success',
      title: product.title,
      price: product.price,
      imagesCount: product.images.length,
    });

    return { success: true, product };

  } catch (error: any) {
    log.error({ type: 'scrape_error', error: error.message });
    return { success: false, error: error.message };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

/**
 * 楽天ショップから商品一覧をスクレイピング
 */
export async function scrapeRakutenShop(
  shopUrl: string,
  limit: number = 50
): Promise<ScraperResult> {
  const log = logger.child({ scraper: 'rakuten-shop', url: shopUrl });
  let page = null;

  try {
    log.info({ type: 'shop_scrape_start', limit });

    page = await createPage();
    await randomDelay(1000, 3000);
    await page.goto(shopUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(500, 1500);

    // 商品リンクを取得
    const productLinks = await page.evaluate(() => {
      const links: string[] = [];
      const itemEls = document.querySelectorAll(
        '.searchresultitem a[href*="item.rakuten.co.jp"], ' +
        '.item_box a[href*="item.rakuten.co.jp"], ' +
        '.dui-card a[href*="item.rakuten.co.jp"]'
      );

      itemEls.forEach((el) => {
        const href = el.getAttribute('href');
        if (href && !links.includes(href)) {
          links.push(href);
        }
      });

      return links;
    });

    log.info({ type: 'found_product_links', count: productLinks.length });

    // 制限数まで商品を取得
    const products: ScrapedProduct[] = [];
    const linksToScrape = productLinks.slice(0, limit);

    for (const link of linksToScrape) {
      await randomDelay(2000, 4000);
      const result = await scrapeRakuten(link);
      if (result.success && result.product) {
        products.push(result.product);
      }
    }

    log.info({ type: 'shop_scrape_complete', total: products.length });

    return { success: true, products };

  } catch (error: any) {
    log.error({ type: 'shop_scrape_error', error: error.message });
    return { success: false, error: error.message };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

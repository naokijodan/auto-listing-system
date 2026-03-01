import { logger } from '@rakuda/logger';
import { ScrapedProduct } from '@rakuda/schema';
import { createPage, randomDelay } from '../puppeteer';
import { ScraperResult } from './index';

/**
 * Amazon商品ページをスクレイピング
 * 注意: Amazonは積極的なボット対策を行っているため、
 * 頻繁なアクセスはブロックされる可能性があります
 */
export async function scrapeAmazon(url: string): Promise<ScraperResult> {
  const log = logger.child({ scraper: 'amazon', url });
  let page = null;

  try {
    // ASINを抽出（Amazon標準の商品ID）
    // 例: https://www.amazon.co.jp/dp/B08XXX または /gp/product/B08XXX
    const asinMatch = url.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
    if (!asinMatch) {
      return { success: false, error: 'Invalid Amazon URL - could not extract ASIN' };
    }
    const asin = asinMatch[1].toUpperCase();

    log.info({ type: 'scrape_start', asin });

    page = await createPage();

    // Amazonのボット検出を回避するためのヘッダー設定
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    await randomDelay(2000, 5000);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await randomDelay(1000, 2000);

    // CAPTCHAチェック
    const hasCaptcha = await page.evaluate(() => {
      return document.body.innerHTML.includes('captcha') ||
             document.body.innerHTML.includes('認証') ||
             document.querySelector('#captchacharacters') !== null;
    });

    if (hasCaptcha) {
      log.warn({ type: 'captcha_detected' });
      return { success: false, error: 'Amazon CAPTCHA detected - manual intervention required' };
    }

    // ページコンテンツを取得
    const productData = await page.evaluate(() => {
      // タイトル
      const titleEl = document.querySelector('#productTitle') ||
                      document.querySelector('.product-title-word-break') ||
                      document.querySelector('[data-feature-name="title"]');
      const title = titleEl?.textContent?.trim() || '';

      // 価格（複数の場所をチェック）
      let price = 0;
      const priceSelectors = [
        '.a-price-whole',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '#priceblock_saleprice',
        '.a-offscreen',
        '[data-a-color="price"] .a-offscreen',
      ];

      for (const selector of priceSelectors) {
        const priceEl = document.querySelector(selector);
        if (priceEl) {
          const priceText = priceEl.textContent || '';
          const extracted = parseInt(priceText.replace(/[^0-9]/g, ''), 10);
          if (extracted > 0) {
            price = extracted;
            break;
          }
        }
      }

      // 説明文
      const descEl = document.querySelector('#productDescription p') ||
                     document.querySelector('#feature-bullets') ||
                     document.querySelector('[data-feature-name="featurebullets"]');
      const description = descEl?.textContent?.trim() || '';

      // 画像
      const images: string[] = [];

      // メイン画像
      const mainImg = document.querySelector('#landingImage') ||
                      document.querySelector('#imgBlkFront') ||
                      document.querySelector('.a-dynamic-image');
      if (mainImg) {
        let src = (mainImg as HTMLImageElement).src ||
                  mainImg.getAttribute('data-old-hires') ||
                  mainImg.getAttribute('data-a-dynamic-image');

        // data-a-dynamic-imageはJSON形式
        if (src && src.startsWith('{')) {
          try {
            const imgObj = JSON.parse(src);
            src = Object.keys(imgObj)[0];
          } catch {}
        }

        if (src && !images.includes(src)) {
          // 高解像度版を取得
          const highRes = src.replace(/\._.*_\./, '.');
          images.push(highRes);
        }
      }

      // サムネイル画像
      const thumbEls = document.querySelectorAll('#altImages img, .imageThumbnail img');
      thumbEls.forEach((img) => {
        let src = (img as HTMLImageElement).src || '';
        if (src && !src.includes('spinner') && !src.includes('transparent-pixel')) {
          const highRes = src.replace(/\._.*_\./, '.').replace(/_SS.*\./, '_SL1500.');
          if (!images.includes(highRes)) {
            images.push(highRes);
          }
        }
      });

      // カテゴリ（パンくずリスト）
      const breadcrumbEls = document.querySelectorAll('#wayfinding-breadcrumbs_feature_div a');
      const categories: string[] = [];
      breadcrumbEls.forEach((el) => {
        const cat = el.textContent?.trim();
        if (cat) categories.push(cat);
      });
      const category = categories.join(' > ');

      // ブランド
      const brandEl = document.querySelector('#bylineInfo') ||
                      document.querySelector('.po-brand .a-span9') ||
                      document.querySelector('[data-feature-name="bylineInfo"]');
      let brand = brandEl?.textContent?.trim() || null;
      if (brand) {
        // "ブランド: XXX" から XXX を抽出
        brand = brand.replace(/^(ブランド|Brand)[:\s]+/i, '').trim();
        // "XXXのストアを表示" を除去
        brand = brand.replace(/のストアを表示.*$/, '').trim();
      }

      // セラー情報
      const sellerEl = document.querySelector('#sellerProfileTriggerId') ||
                       document.querySelector('#merchant-info a') ||
                       document.querySelector('.tabular-buybox-text a');
      const sellerName = sellerEl?.textContent?.trim() || 'Amazon';

      // 在庫状況
      const availabilityEl = document.querySelector('#availability') ||
                             document.querySelector('#outOfStock') ||
                             document.querySelector('.a-color-price');
      const availabilityText = availabilityEl?.textContent?.trim().toLowerCase() || '';
      const isAvailable = !availabilityText.includes('在庫切れ') &&
                          !availabilityText.includes('out of stock') &&
                          !availabilityText.includes('現在在庫がありません');

      // レビュー
      const ratingEl = document.querySelector('#acrPopover') ||
                       document.querySelector('.a-icon-star');
      const ratingText = ratingEl?.getAttribute('title') || ratingEl?.textContent || '';
      const ratingMatch = ratingText.match(/([\d.]+)/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

      const reviewCountEl = document.querySelector('#acrCustomerReviewText');
      const reviewCountText = reviewCountEl?.textContent || '0';
      const reviewCount = parseInt(reviewCountText.replace(/[^0-9]/g, ''), 10) || 0;

      return {
        title,
        price,
        description,
        images,
        category,
        brand,
        sellerName,
        isAvailable,
        rating,
        reviewCount,
      };
    });

    if (!productData.title) {
      log.warn({ type: 'scrape_no_title' });
      return { success: false, error: 'Could not extract product title' };
    }

    const product: ScrapedProduct = {
      sourceUrl: url,
      sourceType: 'AMAZON',
      sourceItemId: asin,
      title: productData.title,
      price: productData.price,
      description: productData.description,
      images: productData.images.slice(0, 10), // 最大10枚
      category: productData.category || undefined,
      brand: productData.brand || undefined,
      sellerId: 'amazon',
      sellerName: productData.sellerName,
      isAvailable: productData.isAvailable,
      scrapedAt: new Date().toISOString(),
    };

    log.info({
      type: 'scrape_success',
      asin,
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
 * Amazon検索結果から商品一覧をスクレイピング
 * 注意: 検索結果のスクレイピングは特にブロックされやすいため、
 * 本番環境ではAmazon Product Advertising API の使用を推奨
 */
export async function scrapeAmazonSearch(
  searchUrl: string,
  limit: number = 20
): Promise<ScraperResult> {
  const log = logger.child({ scraper: 'amazon-search', url: searchUrl });
  let page = null;

  try {
    log.info({ type: 'search_scrape_start', limit });

    page = await createPage();

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    await randomDelay(2000, 5000);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });
    await randomDelay(1000, 2000);

    // 商品リンクを取得
    const productLinks = await page.evaluate(() => {
      const links: string[] = [];
      const itemEls = document.querySelectorAll(
        '[data-asin]:not([data-asin=""]) a.a-link-normal[href*="/dp/"], ' +
        '.s-result-item a.a-link-normal[href*="/dp/"]'
      );

      itemEls.forEach((el) => {
        const href = el.getAttribute('href');
        if (href) {
          // 完全なURLに変換
          const fullUrl = href.startsWith('http')
            ? href
            : `https://www.amazon.co.jp${href}`;
          // クエリパラメータを除去
          const cleanUrl = fullUrl.split('?')[0];
          if (!links.includes(cleanUrl)) {
            links.push(cleanUrl);
          }
        }
      });

      return links;
    });

    log.info({ type: 'found_product_links', count: productLinks.length });

    // 制限数まで商品を取得
    const products: ScrapedProduct[] = [];
    const linksToScrape = productLinks.slice(0, limit);

    for (const link of linksToScrape) {
      // Amazonへの負荷軽減のため、長めの遅延
      await randomDelay(3000, 6000);
      const result = await scrapeAmazon(link);
      if (result.success && result.product) {
        products.push(result.product);
      }
    }

    log.info({ type: 'search_scrape_complete', total: products.length });

    return { success: true, products };

  } catch (error: any) {
    log.error({ type: 'search_scrape_error', error: error.message });
    return { success: false, error: error.message };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

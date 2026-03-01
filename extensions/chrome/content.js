/**
 * RAKUDA Chrome Extension - Content Script
 *
 * 対応サイトの商品ページで動作
 */

// メッセージリスナー（ポップアップからの要求に応答）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractProductInfo') {
    const info = extractProductInfo();
    sendResponse(info);
  }
  return true;
});

// 商品情報を抽出
function extractProductInfo() {
  const url = window.location.href;

  // ヤフオク
  if (url.includes('yahoo.co.jp')) {
    return extractYahooAuction();
  }

  // メルカリ
  if (url.includes('mercari.com')) {
    return extractMercari();
  }

  // Amazon JP
  if (url.includes('amazon.co.jp')) {
    return extractAmazonJP();
  }

  return null;
}

// ヤフオクから抽出
function extractYahooAuction() {
  const title = document.querySelector('.ProductTitle__text')?.textContent?.trim() ||
                document.querySelector('h1.Product__title')?.textContent?.trim() ||
                document.querySelector('h1')?.textContent?.trim();

  const priceText = document.querySelector('.Price__value')?.textContent?.trim() ||
                    document.querySelector('[data-testid="price"]')?.textContent?.trim() ||
                    document.querySelector('.Price')?.textContent?.trim();

  const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, ''), 10) : null;

  const image = document.querySelector('.ProductImage__image img')?.src ||
                document.querySelector('.ProductImage img')?.src ||
                document.querySelector('.Product__imageMain img')?.src;

  const description = document.querySelector('.ProductExplanation__commentBody')?.textContent?.trim() ||
                      document.querySelector('.ProductDetail__description')?.textContent?.trim();

  const seller = document.querySelector('.Seller__name a')?.textContent?.trim() ||
                 document.querySelector('.Seller__nickname')?.textContent?.trim();

  const condition = document.querySelector('.ProductDetail__condition')?.textContent?.trim();

  return {
    title,
    price,
    priceCurrency: 'JPY',
    imageUrl: image,
    description: description?.substring(0, 5000),
    seller,
    condition,
    sourceType: 'YAHOO_AUCTION',
  };
}

// メルカリから抽出
function extractMercari() {
  const title = document.querySelector('[data-testid="name"]')?.textContent?.trim() ||
                document.querySelector('mer-heading')?.textContent?.trim() ||
                document.querySelector('h1')?.textContent?.trim();

  const priceText = document.querySelector('[data-testid="price"]')?.textContent?.trim() ||
                    document.querySelector('mer-price')?.getAttribute('value');

  const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, ''), 10) : null;

  const image = document.querySelector('[data-testid="image-0"] img')?.src ||
                document.querySelector('.item-image img')?.src ||
                document.querySelector('mer-item-thumbnail img')?.src;

  const description = document.querySelector('[data-testid="description"]')?.textContent?.trim() ||
                      document.querySelector('.item-description')?.textContent?.trim();

  const seller = document.querySelector('[data-testid="seller-name"]')?.textContent?.trim();

  const condition = document.querySelector('[data-testid="商品の状態"]')?.textContent?.trim();

  return {
    title,
    price,
    priceCurrency: 'JPY',
    imageUrl: image,
    description: description?.substring(0, 5000),
    seller,
    condition,
    sourceType: 'MERCARI',
  };
}

// Amazon JPから抽出
function extractAmazonJP() {
  const title = document.querySelector('#productTitle')?.textContent?.trim();

  const priceText = document.querySelector('.a-price-whole')?.textContent?.trim() ||
                    document.querySelector('#priceblock_ourprice')?.textContent?.trim() ||
                    document.querySelector('#priceblock_dealprice')?.textContent?.trim() ||
                    document.querySelector('.a-price .a-offscreen')?.textContent?.trim();

  const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, ''), 10) : null;

  const image = document.querySelector('#landingImage')?.src ||
                document.querySelector('#imgBlkFront')?.src ||
                document.querySelector('#main-image')?.src;

  const description = document.querySelector('#productDescription')?.textContent?.trim() ||
                      document.querySelector('#feature-bullets')?.textContent?.trim();

  const seller = document.querySelector('#sellerProfileTriggerId')?.textContent?.trim() ||
                 'Amazon.co.jp';

  // ASIN取得
  const asin = document.querySelector('[data-asin]')?.getAttribute('data-asin') ||
               window.location.pathname.match(/\/dp\/([A-Z0-9]+)/)?.[1];

  return {
    title,
    price,
    priceCurrency: 'JPY',
    imageUrl: image,
    description: description?.substring(0, 5000),
    seller,
    asin,
    sourceType: 'AMAZON',
  };
}

// ページ読み込み完了時にログ出力（デバッグ用）
console.log('[RAKUDA] Content script loaded on:', window.location.href);

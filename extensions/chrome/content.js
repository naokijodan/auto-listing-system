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
  // タイトル: h1が唯一の安定セレクタ
  const title = document.querySelector('h1')?.textContent?.trim();

  // 価格: dl > dd > span 構造で、「円」を含むspan
  let price = null;
  const priceSpans = document.querySelectorAll('dl dd span');
  for (const span of priceSpans) {
    const text = span.textContent?.trim() || '';
    if (/^\d{1,3}(,\d{3})*円$/.test(text)) {
      price = parseInt(text.replace(/[^0-9]/g, ''), 10);
      break;
    }
  }

  // 画像: auctions.c.yimg.jp の画像
  const image = document.querySelector('img[src*="auctions.c.yimg"]')?.src;

  // 説明: "商品説明" h2の次のセクション内のテキスト
  let description = null;
  const h2s = document.querySelectorAll('h2');
  for (const h2 of h2s) {
    if (h2.textContent?.trim() === '商品説明') {
      const section = h2.nextElementSibling || h2.parentElement?.nextElementSibling;
      if (section) {
        description = section.textContent?.trim();
      }
      break;
    }
  }

  // 出品者: /seller/ リンク
  const sellerLink = document.querySelector('a[href*="/seller/"]');
  const seller = sellerLink?.textContent?.trim();

  // 状態: "商品の状態" dt の次の dd
  let condition = null;
  const dts = document.querySelectorAll('dt');
  for (const dt of dts) {
    if (dt.textContent?.trim() === '商品の状態') {
      const dd = dt.nextElementSibling;
      if (dd?.tagName === 'DD') {
        condition = dd.textContent?.trim();
      }
      break;
    }
  }

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

  const seller = document.querySelector('[data-testid="seller-link"]')?.textContent?.trim() ||
                 document.querySelector('a[href*="/user/profile"]')?.textContent?.trim();

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

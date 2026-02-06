/**
 * RAKUDA Chrome Extension - Background Service Worker
 *
 * Manifest V3対応のサービスワーカー
 */

// デフォルト設定
const DEFAULT_CONFIG = {
  apiUrl: 'http://localhost:3000',
  apiKey: '',
};

// 設定を取得
async function getConfig() {
  const result = await chrome.storage.sync.get(DEFAULT_CONFIG);
  return result;
}

// 設定を保存
async function saveConfig(config) {
  await chrome.storage.sync.set(config);
}

// API疎通確認（トレーサー・バレット）
async function pingApi() {
  const config = await getConfig();
  try {
    const response = await fetch(`${config.apiUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 商品を登録
async function registerProduct(productData) {
  const config = await getConfig();

  try {
    const response = await fetch(`${config.apiUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'X-API-Key': config.apiKey } : {}),
      },
      body: JSON.stringify(productData),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// サイトタイプを判定
function detectSiteType(url) {
  if (url.includes('yahoo.co.jp')) {
    if (url.includes('auctions.yahoo.co.jp') || url.includes('page.auctions.yahoo.co.jp')) {
      return 'YAHOO_AUCTION';
    }
    return 'YAHOO';
  }
  if (url.includes('mercari.com')) {
    return 'MERCARI';
  }
  if (url.includes('amazon.co.jp')) {
    return 'AMAZON_JP';
  }
  return 'UNKNOWN';
}

// コンテキストメニュー作成
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'rakuda-register',
    title: 'RAKUDAに商品を登録',
    contexts: ['page', 'link'],
  });

  console.log('RAKUDA Extension installed');
});

// コンテキストメニュークリック
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'rakuda-register') {
    const url = info.linkUrl || info.pageUrl;
    const siteType = detectSiteType(url);

    if (siteType === 'UNKNOWN') {
      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'RAKUDA',
        message: '対応していないサイトです',
      });
      return;
    }

    // コンテンツスクリプトから商品情報を取得
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractProductInfo,
      });

      if (result?.result) {
        const productData = {
          sourceUrl: url,
          sourceType: siteType,
          ...result.result,
        };

        const response = await registerProduct(productData);

        chrome.notifications?.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'RAKUDA',
          message: response.success
            ? '商品を登録しました'
            : `登録失敗: ${response.error}`,
        });
      }
    } catch (error) {
      console.error('Failed to extract product info:', error);
    }
  }
});

// 商品情報を抽出する関数（コンテンツスクリプトとして実行）
function extractProductInfo() {
  const url = window.location.href;

  // ヤフオク
  if (url.includes('yahoo.co.jp')) {
    const title = document.querySelector('.ProductTitle__text')?.textContent?.trim() ||
                  document.querySelector('h1')?.textContent?.trim();
    const priceText = document.querySelector('.Price__value')?.textContent?.trim() ||
                      document.querySelector('[data-testid="price"]')?.textContent?.trim();
    const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, ''), 10) : null;
    const image = document.querySelector('.ProductImage__image img')?.src ||
                  document.querySelector('.ProductImage img')?.src;

    return { title, price, priceCurrency: 'JPY', imageUrl: image };
  }

  // メルカリ
  if (url.includes('mercari.com')) {
    const title = document.querySelector('[data-testid="name"]')?.textContent?.trim() ||
                  document.querySelector('h1')?.textContent?.trim();
    const priceText = document.querySelector('[data-testid="price"]')?.textContent?.trim();
    const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, ''), 10) : null;
    const image = document.querySelector('[data-testid="image-0"] img')?.src ||
                  document.querySelector('.item-image img')?.src;

    return { title, price, priceCurrency: 'JPY', imageUrl: image };
  }

  // Amazon JP
  if (url.includes('amazon.co.jp')) {
    const title = document.querySelector('#productTitle')?.textContent?.trim();
    const priceText = document.querySelector('.a-price-whole')?.textContent?.trim() ||
                      document.querySelector('#priceblock_ourprice')?.textContent?.trim();
    const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, ''), 10) : null;
    const image = document.querySelector('#landingImage')?.src ||
                  document.querySelector('#imgBlkFront')?.src;

    return { title, price, priceCurrency: 'JPY', imageUrl: image };
  }

  return null;
}

// メッセージハンドラ
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    switch (request.action) {
      case 'ping':
        const pingResult = await pingApi();
        sendResponse(pingResult);
        break;

      case 'getConfig':
        const config = await getConfig();
        sendResponse(config);
        break;

      case 'saveConfig':
        await saveConfig(request.config);
        sendResponse({ success: true });
        break;

      case 'register':
        const registerResult = await registerProduct(request.data);
        sendResponse(registerResult);
        break;

      case 'detectSite':
        const siteType = detectSiteType(request.url);
        sendResponse({ siteType });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
  })();

  return true; // 非同期レスポンスを示す
});

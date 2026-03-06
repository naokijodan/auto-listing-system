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
        error: errorData.error || errorData.message || `HTTP ${response.status}`
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// サイトタイプを判定（Prisma enum形式の大文字）
function detectSiteType(url) {
  if (url.includes('yahoo.co.jp')) {
    if (url.includes('auctions.yahoo.co.jp') || url.includes('page.auctions.yahoo.co.jp')) {
      return 'YAHOO_AUCTION';
    }
    return 'YAHOO_FLEA';
  }
  if (url.includes('mercari.com')) {
    return 'MERCARI';
  }
  if (url.includes('amazon.co.jp')) {
    return 'AMAZON';
  }
  if (url.includes('rakuma.rakuten.co.jp')) {
    return 'RAKUMA';
  }
  return null;
}

// URLから商品IDを抽出
function extractItemId(url, siteType) {
  try {
    const urlObj = new URL(url);

    switch (siteType) {
      case 'YAHOO_AUCTION':
        // https://page.auctions.yahoo.co.jp/jp/auction/x1234567890
        const yahooMatch = url.match(/auction\/([a-zA-Z0-9]+)/);
        return yahooMatch ? yahooMatch[1] : urlObj.pathname.split('/').pop();

      case 'MERCARI':
        // https://jp.mercari.com/item/m12345678901
        const mercariMatch = url.match(/item\/([a-zA-Z0-9]+)/);
        return mercariMatch ? mercariMatch[1] : urlObj.pathname.split('/').pop();

      case 'AMAZON':
        // https://www.amazon.co.jp/dp/B08XXXXXX or /gp/product/B08XXXXXX
        const amazonMatch = url.match(/(?:dp|product)\/([A-Z0-9]+)/i);
        return amazonMatch ? amazonMatch[1] : 'unknown';

      default:
        return urlObj.pathname.split('/').filter(Boolean).pop() || 'unknown';
    }
  } catch {
    return 'unknown';
  }
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

// キーボードショートカット
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'register-product') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await registerFromTab(tab);
    }
  }
});

// タブから商品を登録する共通関数
async function registerFromTab(tab) {
  const url = tab.url;
  const siteType = detectSiteType(url);

  if (!siteType) {
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'RAKUDA',
      message: '対応していないサイトです（ヤフオク・メルカリ・Amazon JP）',
    });
    return { success: false, error: '対応していないサイト' };
  }

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractProductInfo,
    });

    if (result?.result) {
      const extracted = result.result;
      const sourceItemId = extractItemId(url, siteType);

      // APIスキーマに合わせたデータ構造
      const productData = {
        sourceType: siteType,
        sourceUrl: url,
        sourceItemId: sourceItemId,
        title: extracted.title || 'タイトル不明',
        description: extracted.description || extracted.title || '',
        price: extracted.price || 0,
        images: extracted.images || (extracted.imageUrl ? [extracted.imageUrl] : []),
        category: extracted.category,
        brand: extracted.brand,
        condition: extracted.condition,
        sellerId: extracted.sellerId,
        sellerName: extracted.sellerName,
        shippingMethod: null,
      };

      // 画像がない場合のフォールバック
      if (productData.images.length === 0) {
        productData.images = ['https://via.placeholder.com/400?text=No+Image'];
      }

      const response = await registerProduct(productData);

      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'RAKUDA',
        message: response.success
          ? `登録完了: ${productData.title.slice(0, 30)}...`
          : `登録失敗: ${response.error}`,
      });

      return response;
    } else {
      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'RAKUDA',
        message: '商品情報を取得できませんでした',
      });
      return { success: false, error: '商品情報取得失敗' };
    }
  } catch (error) {
    console.error('Failed to extract product info:', error);
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'RAKUDA',
      message: `エラー: ${error.message}`,
    });
    return { success: false, error: error.message };
  }
}

// コンテキストメニュークリック
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'rakuda-register') {
    await registerFromTab(tab);
  }
});

// 商品情報を抽出する関数（コンテンツスクリプトとして実行）
function extractProductInfo() {
  const url = window.location.href;

  // ヤフオク
  if (url.includes('yahoo.co.jp')) {
    const title = document.querySelector('h1')?.textContent?.trim();

    // 価格: dl > dd > span 構造で「X,XXX円」パターンにマッチ
    let price = null;
    const priceSpans = document.querySelectorAll('dl dd span');
    for (const span of priceSpans) {
      const text = span.textContent?.trim() || '';
      if (/^\d{1,3}(,\d{3})*円$/.test(text)) {
        price = parseInt(text.replace(/[^0-9]/g, ''), 10);
        break;
      }
    }

    // 複数画像: auctions.c.yimg.jp を含むimg、重複除去
    const imageSet = new Set();
    const imgElements = document.querySelectorAll('img[src*="auctions.c.yimg"]');
    for (const img of imgElements) {
      const src = img.src;
      if (src && !imageSet.has(src)) {
        imageSet.add(src);
      }
    }
    const images = Array.from(imageSet).slice(0, 10);

    // 説明: "商品説明" h2の次のセクション
    let description = '';
    const h2s = document.querySelectorAll('h2');
    for (const h2 of h2s) {
      if (h2.textContent?.trim() === '商品説明') {
        const section = h2.nextElementSibling || h2.parentElement?.nextElementSibling;
        if (section) {
          description = section.textContent?.trim() || '';
        }
        break;
      }
    }

    // 出品者
    const sellerLink = document.querySelector('a[href*="/seller/"]');
    const sellerName = sellerLink?.textContent?.trim();
    const sellerId = sellerLink?.href?.match(/\/seller\/([^/?]+)/)?.[1];

    // 商品の状態
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
      images,
      description: description.substring(0, 5000),
      sellerName,
      sellerId,
      condition,
    };
  }

  // メルカリ
  if (url.includes('mercari.com')) {
    const title = document.querySelector('[data-testid="name"]')?.textContent?.trim() ||
                  document.querySelector('h1')?.textContent?.trim();

    const priceText = document.querySelector('[data-testid="price"]')?.textContent?.trim();
    const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, ''), 10) : null;

    // 複数画像を取得
    const imageElements = document.querySelectorAll('[data-testid^="image-"] img, .item-photo img');
    const images = Array.from(imageElements)
      .map(img => img.src)
      .filter(src => src && src.startsWith('http'))
      .slice(0, 10);

    const description = document.querySelector('[data-testid="description"]')?.textContent?.trim() ||
                        document.querySelector('.item-description')?.textContent?.trim() || '';

    const sellerName = document.querySelector('[data-testid="seller-link"]')?.textContent?.trim();
    const condition = document.querySelector('[data-testid="商品の状態"]')?.textContent?.trim() ||
                      document.querySelector('.item-condition')?.textContent?.trim();
    const category = document.querySelector('[data-testid="item-detail-category"]')?.textContent?.trim();
    const brand = document.querySelector('[data-testid="brand"]')?.textContent?.trim();

    return {
      title,
      price,
      images,
      description,
      sellerName,
      condition,
      category,
      brand,
    };
  }

  // Amazon JP
  if (url.includes('amazon.co.jp')) {
    const title = document.querySelector('#productTitle')?.textContent?.trim();

    const priceText = document.querySelector('.a-price-whole')?.textContent?.trim() ||
                      document.querySelector('#priceblock_ourprice')?.textContent?.trim() ||
                      document.querySelector('.a-offscreen')?.textContent?.trim();
    const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, ''), 10) : null;

    // 複数画像を取得
    const imageElements = document.querySelectorAll('#altImages img, .imageThumbnail img');
    const images = Array.from(imageElements)
      .map(img => {
        // サムネイルURLをフルサイズに変換
        let src = img.src || img.dataset?.src;
        if (src) {
          src = src.replace(/\._[^.]+_\./, '.');
        }
        return src;
      })
      .filter(src => src && src.startsWith('http') && !src.includes('sprite'))
      .slice(0, 10);

    // メイン画像フォールバック
    if (images.length === 0) {
      const mainImage = document.querySelector('#landingImage')?.src ||
                        document.querySelector('#imgBlkFront')?.src;
      if (mainImage) images.push(mainImage);
    }

    const description = document.querySelector('#productDescription')?.textContent?.trim() ||
                        document.querySelector('#feature-bullets')?.textContent?.trim() || '';

    const brand = document.querySelector('#bylineInfo')?.textContent?.trim()?.replace('ブランド: ', '');

    return {
      title,
      price,
      images,
      description,
      brand,
    };
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

      case 'registerFromTab':
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          const result = await registerFromTab(tab);
          sendResponse(result);
        } else {
          sendResponse({ success: false, error: 'タブが見つかりません' });
        }
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

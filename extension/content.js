// RAKUDA Content Script
// ページからの情報取得とサイドパネルとの連携

(function() {
  'use strict';

  const url = window.location.href;

  // サイト検出
  const SITE_CONFIGS = {
    mercari: {
      pattern: /jp\.mercari\.com/,
      itemPattern: /\/item\/([a-zA-Z0-9]+)/,
      sellerPattern: /\/(user\/profile|seller)\/([a-zA-Z0-9]+)/,
      extractors: {
        title: () => document.querySelector('[data-testid="name"]')?.textContent?.trim()
          || document.querySelector('h1')?.textContent?.trim(),
        price: () => {
          const priceEl = document.querySelector('[data-testid="price"]')
            || document.querySelector('.item-price');
          if (priceEl) {
            const match = priceEl.textContent.match(/[\d,]+/);
            return match ? parseInt(match[0].replace(/,/g, '')) : null;
          }
          return null;
        },
        image: () => document.querySelector('picture img')?.src
          || document.querySelector('[data-testid="image"]')?.src,
        description: () => document.querySelector('[data-testid="description"]')?.textContent?.trim(),
        condition: () => document.querySelector('[data-testid="商品の状態"]')?.textContent?.trim(),
        sellerName: () => document.querySelector('[data-testid="seller-name"]')?.textContent?.trim(),
      }
    },
    yahoo_auction: {
      pattern: /auctions\.yahoo\.co\.jp/,
      itemPattern: /\/auction\/([a-zA-Z0-9]+)/,
      sellerPattern: /\/seller\/([a-zA-Z0-9_-]+)/,
      extractors: {
        title: () => document.querySelector('.ProductTitle__text')?.textContent?.trim()
          || document.querySelector('h1')?.textContent?.trim(),
        price: () => {
          const priceEl = document.querySelector('.Price__value')
            || document.querySelector('.Price');
          if (priceEl) {
            const match = priceEl.textContent.match(/[\d,]+/);
            return match ? parseInt(match[0].replace(/,/g, '')) : null;
          }
          return null;
        },
        image: () => document.querySelector('.ProductImage__image img')?.src,
        description: () => document.querySelector('.ProductExplanation__commentArea')?.textContent?.trim(),
        condition: () => document.querySelector('[data-auction-item-condition]')?.textContent?.trim(),
      }
    },
    yahoo_flea: {
      pattern: /paypayfleamarket\.yahoo\.co\.jp/,
      itemPattern: /\/item\/([a-zA-Z0-9]+)/,
      extractors: {
        title: () => document.querySelector('h1')?.textContent?.trim(),
        price: () => {
          const priceEl = document.querySelector('[data-testid="item-price"]');
          if (priceEl) {
            const match = priceEl.textContent.match(/[\d,]+/);
            return match ? parseInt(match[0].replace(/,/g, '')) : null;
          }
          return null;
        },
        image: () => document.querySelector('.item-image img')?.src,
      }
    },
    rakuma: {
      pattern: /fril\.jp/,
      itemPattern: /\/item\/([a-zA-Z0-9]+)/,
      extractors: {
        title: () => document.querySelector('.item-name')?.textContent?.trim()
          || document.querySelector('h1')?.textContent?.trim(),
        price: () => {
          const priceEl = document.querySelector('.item-price')
            || document.querySelector('.price');
          if (priceEl) {
            const match = priceEl.textContent.match(/[\d,]+/);
            return match ? parseInt(match[0].replace(/,/g, '')) : null;
          }
          return null;
        },
        image: () => document.querySelector('.item-image img')?.src,
      }
    },
    rakuten: {
      pattern: /item\.rakuten\.co\.jp/,
      itemPattern: /\/([^\/]+)\/([^\/\?]+)/,
      extractors: {
        title: () => document.querySelector('.item-name')?.textContent?.trim()
          || document.querySelector('h1')?.textContent?.trim(),
        price: () => {
          const priceEl = document.querySelector('.price2');
          if (priceEl) {
            const match = priceEl.textContent.match(/[\d,]+/);
            return match ? parseInt(match[0].replace(/,/g, '')) : null;
          }
          return null;
        },
        image: () => document.querySelector('.rakutenLimitedId_ImageMain1-3 img')?.src,
      }
    },
    amazon: {
      pattern: /amazon\.co\.jp/,
      itemPattern: /\/(dp|gp\/product)\/([A-Z0-9]+)/,
      extractors: {
        title: () => document.getElementById('productTitle')?.textContent?.trim(),
        price: () => {
          const priceEl = document.querySelector('.a-price .a-offscreen')
            || document.getElementById('priceblock_ourprice');
          if (priceEl) {
            const match = priceEl.textContent.match(/[\d,]+/);
            return match ? parseInt(match[0].replace(/,/g, '')) : null;
          }
          return null;
        },
        image: () => document.getElementById('landingImage')?.src
          || document.querySelector('#imgTagWrapperId img')?.src,
        description: () => document.getElementById('feature-bullets')?.textContent?.trim(),
      }
    },
  };

  // 現在のサイトを検出
  function detectSite() {
    for (const [name, config] of Object.entries(SITE_CONFIGS)) {
      if (config.pattern.test(url)) {
        return { name, config };
      }
    }
    return null;
  }

  // ページ情報を抽出
  function extractPageInfo() {
    const site = detectSite();
    if (!site) {
      return { url, title: document.title, supported: false };
    }

    const { name, config } = site;
    const extractors = config.extractors;

    // 商品IDを抽出
    let itemId = null;
    const itemMatch = url.match(config.itemPattern);
    if (itemMatch) {
      itemId = itemMatch[itemMatch.length - 1];
    }

    // セラーIDを抽出（あれば）
    let sellerId = null;
    if (config.sellerPattern) {
      const sellerMatch = url.match(config.sellerPattern);
      if (sellerMatch) {
        sellerId = sellerMatch[sellerMatch.length - 1];
      }
    }

    // 各フィールドを抽出
    const info = {
      url,
      source: name,
      itemId,
      sellerId,
      supported: true,
      isItemPage: !!itemId,
      isSellerPage: !!sellerId && !itemId,
    };

    // エクストラクターを実行
    for (const [field, extractor] of Object.entries(extractors)) {
      try {
        const value = extractor();
        if (value) {
          info[field] = value;
        }
      } catch (e) {
        console.warn(`[RAKUDA] Failed to extract ${field}:`, e);
      }
    }

    return info;
  }

  // 商品ページ検出時の通知
  function notifyItemDetected() {
    const info = extractPageInfo();

    if (info.supported && info.isItemPage) {
      chrome.runtime.sendMessage({
        type: 'ITEM_DETECTED',
        source: info.source,
        itemId: info.itemId,
        url: info.url,
        pageInfo: info,
      }).catch(() => {
        // 拡張機能のバックグラウンドが応答しない場合は無視
      });
    }
  }

  // メッセージリスナー
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_PAGE_INFO') {
      const info = extractPageInfo();
      sendResponse(info);
      return true;
    }

    if (request.type === 'EXTRACT_SELLER_ITEMS') {
      const items = extractSellerItems();
      sendResponse({ items });
      return true;
    }

    return false;
  });

  // セラーページから商品リストを抽出
  function extractSellerItems() {
    const site = detectSite();
    if (!site) return [];

    const { name } = site;
    const items = [];

    try {
      if (name === 'mercari') {
        // メルカリのセラーページ
        const itemElements = document.querySelectorAll('[data-testid="item-cell"]')
          || document.querySelectorAll('.items-box');

        itemElements.forEach(el => {
          const link = el.querySelector('a');
          const img = el.querySelector('img');
          const priceEl = el.querySelector('[data-testid="price"]')
            || el.querySelector('.items-box-price');

          if (link?.href) {
            const match = link.href.match(/\/item\/([a-zA-Z0-9]+)/);
            if (match) {
              items.push({
                itemId: match[1],
                url: link.href,
                thumbnail: img?.src,
                price: priceEl ? parseInt(priceEl.textContent.replace(/[^\d]/g, '')) : null,
              });
            }
          }
        });
      } else if (name === 'yahoo_auction') {
        // ヤフオクのセラーページ
        const itemElements = document.querySelectorAll('.Product');

        itemElements.forEach(el => {
          const link = el.querySelector('a');
          const img = el.querySelector('img');
          const priceEl = el.querySelector('.Product__priceValue');

          if (link?.href) {
            const match = link.href.match(/\/auction\/([a-zA-Z0-9]+)/);
            if (match) {
              items.push({
                itemId: match[1],
                url: link.href,
                thumbnail: img?.src,
                price: priceEl ? parseInt(priceEl.textContent.replace(/[^\d]/g, '')) : null,
              });
            }
          }
        });
      }
    } catch (e) {
      console.error('[RAKUDA] Failed to extract seller items:', e);
    }

    return items;
  }

  // 初期化
  notifyItemDetected();

  // SPA対応：URL変更を監視
  let lastUrl = url;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(notifyItemDetected, 500);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // History API監視
  const originalPushState = history.pushState;
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    setTimeout(notifyItemDetected, 500);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    setTimeout(notifyItemDetected, 500);
  };

  window.addEventListener('popstate', () => {
    setTimeout(notifyItemDetected, 500);
  });
})();

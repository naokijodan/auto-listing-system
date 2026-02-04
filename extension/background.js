// Background Service Worker for RAKUDA Extension

// アイコンクリックでサイドパネルを開く
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// タブ更新時にコンテンツスクリプトからのメッセージを処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ITEM_DETECTED') {
    // サイドパネルに商品情報を転送
    chrome.runtime.sendMessage({
      type: 'UPDATE_ITEM_INFO',
      data: message,
    }).catch(() => {
      // サイドパネルが開いていない場合は無視
    });
  }

  if (message.type === 'GET_CURRENT_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      sendResponse({ tab });
    });
    return true; // async response
  }

  return false;
});

// 拡張機能インストール/更新時の処理
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 初期設定
    chrome.storage.local.set({
      apiUrl: 'http://localhost:3000',
      theme: 'system',
      defaultMarketplace: 'joom',
    });
  }
});

// コンテキストメニュー（将来の拡張用）
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'rakuda-add-item',
    title: 'RAKUDAに追加',
    contexts: ['link'],
    documentUrlPatterns: [
      'https://jp.mercari.com/*',
      'https://auctions.yahoo.co.jp/*',
      'https://paypayfleamarket.yahoo.co.jp/*',
      'https://fril.jp/*',
    ],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'rakuda-add-item' && info.linkUrl) {
    // リンクを追加キューに入れる
    const settings = await chrome.storage.local.get(['apiUrl']);
    const apiUrl = settings.apiUrl || 'http://localhost:3000';

    try {
      await fetch(`${apiUrl}/api/products/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: info.linkUrl,
          source: detectSource(info.linkUrl),
          marketplace: ['joom'],
          options: { processImages: true, translate: true },
        }),
      });
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  }
});

function detectSource(url) {
  if (url.includes('mercari.com')) return 'mercari';
  if (url.includes('auctions.yahoo.co.jp')) return 'yahoo_auction';
  if (url.includes('paypayfleamarket')) return 'yahoo_flea';
  if (url.includes('fril.jp')) return 'rakuma';
  if (url.includes('rakuten.co.jp')) return 'rakuten';
  if (url.includes('amazon.co.jp')) return 'amazon';
  return 'unknown';
}

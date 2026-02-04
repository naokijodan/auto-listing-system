// Content Script
// 将来的にページからの情報取得に使用

// ページ読み込み完了時の処理
(function() {
  // 対応サイトかチェック
  const url = window.location.href;

  // メルカリの場合、商品IDを抽出
  if (url.includes('jp.mercari.com/item/')) {
    const itemId = url.match(/item\/([a-zA-Z0-9]+)/)?.[1];
    if (itemId) {
      // 拡張機能へ商品IDを通知
      chrome.runtime.sendMessage({
        type: 'ITEM_DETECTED',
        source: 'mercari',
        itemId: itemId,
        url: url,
      });
    }
  }

  // メッセージリスナー（popup.jsからのリクエスト用）
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_PAGE_INFO') {
      // ページから情報を取得して返す
      const pageInfo = extractPageInfo();
      sendResponse(pageInfo);
    }
    return true;
  });

  function extractPageInfo() {
    // 将来的にここでページから情報を直接取得可能
    // 現在はサーバーサイドスクレイピングを使用
    return {
      url: window.location.href,
      title: document.title,
    };
  }
})();

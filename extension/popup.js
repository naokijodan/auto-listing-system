// サポート対象のURLパターン
const SUPPORTED_PATTERNS = [
  { pattern: /^https:\/\/jp\.mercari\.com\/item\//, source: 'mercari', name: 'メルカリ' },
  { pattern: /^https:\/\/www\.mercari\.com\/jp\/items\//, source: 'mercari', name: 'メルカリ' },
  { pattern: /^https:\/\/auctions\.yahoo\.co\.jp\/jp\/auction\//, source: 'yahoo_auction', name: 'ヤフオク' },
  { pattern: /^https:\/\/paypayfleamarket\.yahoo\.co\.jp\/item\//, source: 'yahoo_flea', name: 'PayPayフリマ' },
  { pattern: /^https:\/\/fril\.jp\/item\//, source: 'rakuma', name: 'ラクマ' },
  { pattern: /^https:\/\/item\.rakuten\.co\.jp\//, source: 'rakuten', name: '楽天' },
  { pattern: /^https:\/\/www\.amazon\.co\.jp\/(dp|gp\/product)\//, source: 'amazon', name: 'Amazon' },
];

// セラーページのパターン（一括取得用）
const SELLER_PATTERNS = [
  { pattern: /^https:\/\/jp\.mercari\.com\/user\/profile\//, source: 'mercari', name: 'メルカリ セラー' },
  { pattern: /^https:\/\/auctions\.yahoo\.co\.jp\/seller\//, source: 'yahoo_auction', name: 'ヤフオク セラー' },
];

let currentTab = null;
let currentSource = null;
let isSupportedPage = false;
let isSellerPage = false;

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  // 設定読み込み
  const settings = await chrome.storage.local.get(['apiUrl']);
  if (settings.apiUrl) {
    document.getElementById('apiUrl').value = settings.apiUrl;
  }

  // 現在のタブ情報取得
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  updateUI(tab.url);

  // イベントリスナー設定
  setupEventListeners();
});

function updateUI(url) {
  const urlDisplay = document.getElementById('currentUrl');
  const statusDisplay = document.getElementById('pageStatus');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnBulk = document.getElementById('btnBulk');

  // URL表示（短縮）
  urlDisplay.textContent = url.length > 50 ? url.substring(0, 50) + '...' : url;

  // 商品ページチェック
  for (const { pattern, source, name } of SUPPORTED_PATTERNS) {
    if (pattern.test(url)) {
      isSupportedPage = true;
      currentSource = source;
      statusDisplay.textContent = `${name} - 対応`;
      statusDisplay.className = 'status-value supported';
      btnSubmit.disabled = false;
      return;
    }
  }

  // セラーページチェック
  for (const { pattern, source, name } of SELLER_PATTERNS) {
    if (pattern.test(url)) {
      isSellerPage = true;
      currentSource = source;
      statusDisplay.textContent = `${name} - 一括取得可能`;
      statusDisplay.className = 'status-value supported';
      btnBulk.disabled = false;
      return;
    }
  }

  // 非対応ページ
  statusDisplay.textContent = '非対応ページ';
  statusDisplay.className = 'status-value unsupported';
}

function setupEventListeners() {
  // マーケットプレイス選択
  document.querySelectorAll('.marketplace-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.marketplace-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      option.querySelector('input').checked = true;
    });
  });

  // API URL保存
  document.getElementById('apiUrl').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ apiUrl: e.target.value });
    showMessage('API URLを保存しました', 'success');
  });

  // 出品リクエスト送信
  document.getElementById('btnSubmit').addEventListener('click', handleSubmit);

  // セラー一括取得
  document.getElementById('btnBulk').addEventListener('click', handleBulkSubmit);
}

async function handleSubmit() {
  if (!isSupportedPage || !currentTab) return;

  const apiUrl = document.getElementById('apiUrl').value;
  const marketplace = document.querySelector('input[name="marketplace"]:checked').value;
  const btn = document.getElementById('btnSubmit');

  btn.disabled = true;
  btn.textContent = '送信中...';
  showMessage('リクエストを送信中...', 'loading');

  try {
    const response = await fetch(`${apiUrl}/api/products/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: currentTab.url,
        source: currentSource,
        marketplace: marketplace === 'both' ? ['joom', 'ebay'] : [marketplace],
        options: {
          processImages: true,
          translate: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'リクエストに失敗しました');
    }

    const result = await response.json();
    showMessage(`ジョブを登録しました (ID: ${result.jobId})`, 'success');
  } catch (error) {
    showMessage(`エラー: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '出品リクエスト送信';
  }
}

async function handleBulkSubmit() {
  if (!isSellerPage || !currentTab) return;

  const apiUrl = document.getElementById('apiUrl').value;
  const marketplace = document.querySelector('input[name="marketplace"]:checked').value;
  const btn = document.getElementById('btnBulk');

  btn.disabled = true;
  btn.textContent = '送信中...';
  showMessage('セラー情報を取得中...', 'loading');

  try {
    const response = await fetch(`${apiUrl}/api/products/scrape-seller`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: currentTab.url,
        source: currentSource,
        marketplace: marketplace === 'both' ? ['joom', 'ebay'] : [marketplace],
        options: {
          processImages: true,
          translate: true,
          limit: 50, // 最大50件
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'リクエストに失敗しました');
    }

    const result = await response.json();
    showMessage(`${result.count}件のジョブを登録しました`, 'success');
  } catch (error) {
    showMessage(`エラー: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'セラー一括取得';
  }
}

function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

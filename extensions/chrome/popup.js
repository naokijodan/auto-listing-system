/**
 * RAKUDA Chrome Extension - Popup Script
 */

// DOM要素
const elements = {
  connectionStatus: document.getElementById('connectionStatus'),
  mainView: document.getElementById('mainView'),
  settingsView: document.getElementById('settingsView'),
  pageInfo: document.getElementById('pageInfo'),
  siteIcon: document.getElementById('siteIcon'),
  siteName: document.getElementById('siteName'),
  pageTitle: document.getElementById('pageTitle'),
  productPreview: document.getElementById('productPreview'),
  previewImage: document.getElementById('previewImage'),
  previewTitle: document.getElementById('previewTitle'),
  previewPrice: document.getElementById('previewPrice'),
  registerBtn: document.getElementById('registerBtn'),
  recentSection: document.getElementById('recentSection'),
  recentList: document.getElementById('recentList'),
  settingsBtn: document.getElementById('settingsBtn'),
  backBtn: document.getElementById('backBtn'),
  apiUrl: document.getElementById('apiUrl'),
  apiKey: document.getElementById('apiKey'),
  testConnectionBtn: document.getElementById('testConnectionBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  loading: document.getElementById('loading'),
  toast: document.getElementById('toast'),
};

// サイト情報
const siteInfo = {
  YAHOO_AUCTION: { icon: '🔨', name: 'ヤフオク' },
  YAHOO: { icon: '🔨', name: 'Yahoo' },
  MERCARI: { icon: '🛍️', name: 'メルカリ' },
  AMAZON: { icon: '📦', name: 'Amazon' },
  UNKNOWN: { icon: '❓', name: '非対応サイト' },
};

// 現在のタブ情報
let currentTab = null;
let currentSiteType = 'UNKNOWN';
let currentProductInfo = null;

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await checkConnection();
  await loadCurrentTab();
  await loadRecentRegistrations();
  setupEventListeners();
});

// イベントリスナー設定
function setupEventListeners() {
  elements.settingsBtn.addEventListener('click', showSettings);
  elements.backBtn.addEventListener('click', hideSettings);
  elements.testConnectionBtn.addEventListener('click', testConnection);
  elements.saveSettingsBtn.addEventListener('click', saveSettings);
  elements.registerBtn.addEventListener('click', registerProduct);
}

// 設定を読み込み
async function loadSettings() {
  const config = await chrome.runtime.sendMessage({ action: 'getConfig' });
  elements.apiUrl.value = config.apiUrl || 'http://localhost:3000';
  elements.apiKey.value = config.apiKey || '';
}

// 接続確認
async function checkConnection() {
  updateConnectionStatus('checking');

  const result = await chrome.runtime.sendMessage({ action: 'ping' });

  if (result.success) {
    updateConnectionStatus('connected');
  } else {
    updateConnectionStatus('disconnected', result.error);
  }
}

// 接続状態を更新
function updateConnectionStatus(status, message = '') {
  const statusDot = elements.connectionStatus.querySelector('.status-dot');
  const statusText = elements.connectionStatus.querySelector('.status-text');

  statusDot.className = 'status-dot';

  switch (status) {
    case 'checking':
      statusDot.classList.add('checking');
      statusText.textContent = '接続確認中...';
      break;
    case 'connected':
      statusDot.classList.add('connected');
      statusText.textContent = '接続済み';
      break;
    case 'disconnected':
      statusDot.classList.add('disconnected');
      statusText.textContent = message ? `未接続: ${message}` : '未接続';
      break;
  }
}

// 現在のタブを取得
async function loadCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab?.url) {
    elements.pageTitle.textContent = 'ページ情報を取得できません';
    return;
  }

  // サイトタイプを判定
  const result = await chrome.runtime.sendMessage({
    action: 'detectSite',
    url: tab.url,
  });

  currentSiteType = result.siteType;
  const site = siteInfo[currentSiteType];

  elements.siteIcon.textContent = site.icon;
  elements.siteName.textContent = site.name;
  elements.pageTitle.textContent = tab.title || 'タイトルなし';

  // 対応サイトの場合は商品情報を取得
  if (currentSiteType !== 'UNKNOWN') {
    await loadProductInfo();
    elements.registerBtn.disabled = false;
  } else {
    elements.registerBtn.disabled = true;
    elements.productPreview.classList.add('hidden');
  }
}

// 商品情報を取得
async function loadProductInfo() {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: extractProductInfo,
    });

    if (result?.result) {
      currentProductInfo = result.result;
      showProductPreview(currentProductInfo);
    }
  } catch (error) {
    console.error('Failed to extract product info:', error);
  }
}

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

// 商品プレビューを表示
function showProductPreview(info) {
  if (!info) {
    elements.productPreview.classList.add('hidden');
    return;
  }

  if (info.imageUrl) {
    elements.previewImage.src = info.imageUrl;
    elements.previewImage.classList.remove('hidden');
  } else {
    elements.previewImage.classList.add('hidden');
  }

  elements.previewTitle.textContent = info.title || 'タイトル不明';
  elements.previewPrice.textContent = info.price
    ? `¥${info.price.toLocaleString()}`
    : '価格不明';

  elements.productPreview.classList.remove('hidden');
}

// 商品を登録
async function registerProduct() {
  if (!currentTab?.url || currentSiteType === 'UNKNOWN') {
    showToast('この商品は登録できません', 'error');
    return;
  }

  showLoading(true);

  const productData = {
    sourceUrl: currentTab.url,
    sourceType: currentSiteType,
    ...(currentProductInfo || {}),
  };

  const result = await chrome.runtime.sendMessage({
    action: 'register',
    data: productData,
  });

  showLoading(false);

  if (result.success) {
    showToast('商品を登録しました！', 'success');
    await saveRecentRegistration({
      url: currentTab.url,
      title: currentProductInfo?.title || currentTab.title,
      timestamp: Date.now(),
    });
    await loadRecentRegistrations();
  } else {
    showToast(`登録失敗: ${result.error}`, 'error');
  }
}

// 最近の登録を保存
async function saveRecentRegistration(item) {
  const { recentRegistrations = [] } = await chrome.storage.local.get('recentRegistrations');
  const updated = [item, ...recentRegistrations].slice(0, 10);
  await chrome.storage.local.set({ recentRegistrations: updated });
}

// 最近の登録を読み込み
async function loadRecentRegistrations() {
  const { recentRegistrations = [] } = await chrome.storage.local.get('recentRegistrations');

  if (recentRegistrations.length === 0) {
    elements.recentSection.classList.add('hidden');
    return;
  }

  elements.recentList.innerHTML = recentRegistrations
    .map((item) => `
      <li class="recent-item">
        <a href="${item.url}" target="_blank" title="${item.title}">
          ${truncate(item.title, 30)}
        </a>
        <span class="recent-time">${formatTime(item.timestamp)}</span>
      </li>
    `)
    .join('');

  elements.recentSection.classList.remove('hidden');
}

// 設定画面を表示
function showSettings() {
  elements.mainView.classList.add('hidden');
  elements.settingsView.classList.remove('hidden');
}

// 設定画面を非表示
function hideSettings() {
  elements.settingsView.classList.add('hidden');
  elements.mainView.classList.remove('hidden');
}

// 接続テスト
async function testConnection() {
  showLoading(true);

  // 一時的に設定を適用してテスト
  const tempConfig = {
    apiUrl: elements.apiUrl.value,
    apiKey: elements.apiKey.value,
  };
  await chrome.runtime.sendMessage({ action: 'saveConfig', config: tempConfig });

  const result = await chrome.runtime.sendMessage({ action: 'ping' });

  showLoading(false);

  if (result.success) {
    showToast('接続成功！', 'success');
    updateConnectionStatus('connected');
  } else {
    showToast(`接続失敗: ${result.error}`, 'error');
    updateConnectionStatus('disconnected', result.error);
  }
}

// 設定を保存
async function saveSettings() {
  const config = {
    apiUrl: elements.apiUrl.value,
    apiKey: elements.apiKey.value,
  };

  await chrome.runtime.sendMessage({ action: 'saveConfig', config });
  showToast('設定を保存しました', 'success');
  hideSettings();
  await checkConnection();
}

// ローディング表示
function showLoading(show) {
  if (show) {
    elements.loading.classList.remove('hidden');
  } else {
    elements.loading.classList.add('hidden');
  }
}

// トースト表示
function showToast(message, type = 'info') {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type}`;
  elements.toast.classList.remove('hidden');

  setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 3000);
}

// 文字列を切り詰め
function truncate(str, maxLength) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

// 時間をフォーマット
function formatTime(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  return `${days}日前`;
}

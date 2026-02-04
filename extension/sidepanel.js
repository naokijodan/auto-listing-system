// RAKUDA Side Panel JavaScript

// サポート対象のURLパターン
const SUPPORTED_PATTERNS = [
  { pattern: /^https:\/\/jp\.mercari\.com\/item\//, source: 'mercari', name: 'メルカリ' },
  { pattern: /^https:\/\/www\.mercari\.com\/jp\/items\//, source: 'mercari', name: 'メルカリ' },
  { pattern: /^https:\/\/auctions\.yahoo\.co\.jp\/(jp\/)?auction\//, source: 'yahoo_auction', name: 'ヤフオク' },
  { pattern: /^https:\/\/paypayfleamarket\.yahoo\.co\.jp\/item\//, source: 'yahoo_flea', name: 'PayPayフリマ' },
  { pattern: /^https:\/\/fril\.jp\/item\//, source: 'rakuma', name: 'ラクマ' },
  { pattern: /^https:\/\/item\.rakuten\.co\.jp\//, source: 'rakuten', name: '楽天' },
  { pattern: /^https:\/\/www\.amazon\.co\.jp\/(dp|gp\/product)\//, source: 'amazon', name: 'Amazon' },
];

// セラーページのパターン（一括取得用）
const SELLER_PATTERNS = [
  { pattern: /^https:\/\/jp\.mercari\.com\/user\/profile\//, source: 'mercari', name: 'メルカリ セラー' },
  { pattern: /^https:\/\/jp\.mercari\.com\/seller\//, source: 'mercari', name: 'メルカリ セラー' },
  { pattern: /^https:\/\/auctions\.yahoo\.co\.jp\/seller\//, source: 'yahoo_auction', name: 'ヤフオク セラー' },
];

// State
let currentTab = null;
let currentSource = null;
let isSupportedPage = false;
let isSellerPage = false;
let templates = [];
let isConnected = false;
let bulkProgress = { current: 0, total: 0 };

// DOM Elements
const elements = {};

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  await loadSettings();
  await checkConnection();
  await loadTemplates();
  await updateCurrentTab();
  setupEventListeners();
  startPolling();
});

function cacheElements() {
  elements.currentUrl = document.getElementById('currentUrl');
  elements.pageStatus = document.getElementById('pageStatus');
  elements.templateSelect = document.getElementById('templateSelect');
  elements.btnSubmit = document.getElementById('btnSubmit');
  elements.btnBulk = document.getElementById('btnBulk');
  elements.btnTheme = document.getElementById('btnTheme');
  elements.btnRefresh = document.getElementById('btnRefresh');
  elements.btnSettings = document.getElementById('btnSettings');
  elements.message = document.getElementById('message');
  elements.progressSection = document.getElementById('progressSection');
  elements.progressBar = document.getElementById('progressBar');
  elements.progressText = document.getElementById('progressText');
  elements.recentList = document.getElementById('recentList');
  elements.settingsPanel = document.getElementById('settingsPanel');
  elements.apiUrl = document.getElementById('apiUrl');
  elements.profitRate = document.getElementById('profitRate');
  elements.connectionDot = document.getElementById('connectionDot');
  elements.connectionText = document.getElementById('connectionText');
}

async function loadSettings() {
  const settings = await chrome.storage.local.get(['apiUrl', 'theme', 'profitRate']);

  if (settings.apiUrl) {
    elements.apiUrl.value = settings.apiUrl;
  }

  if (settings.profitRate) {
    elements.profitRate.value = settings.profitRate;
  }

  // テーマ適用
  const theme = settings.theme || 'system';
  applyTheme(theme);
}

function applyTheme(theme) {
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
}

async function checkConnection() {
  const apiUrl = elements.apiUrl.value;
  try {
    const response = await fetch(`${apiUrl}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    isConnected = response.ok;
  } catch {
    isConnected = false;
  }

  updateConnectionStatus();
}

function updateConnectionStatus() {
  elements.connectionDot.classList.toggle('connected', isConnected);
  elements.connectionText.textContent = isConnected ? 'APIに接続済み' : 'API未接続';
}

async function loadTemplates() {
  if (!isConnected) return;

  const apiUrl = elements.apiUrl.value;
  try {
    const response = await fetch(`${apiUrl}/api/templates`);
    if (response.ok) {
      const result = await response.json();
      templates = result.data || [];
      renderTemplateOptions();
    }
  } catch {
    // テンプレートAPI未実装の場合は無視
    templates = [];
  }
}

function renderTemplateOptions() {
  const select = elements.templateSelect;
  select.innerHTML = '<option value="">テンプレートを選択</option>';

  templates.forEach(template => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = template.name;
    select.appendChild(option);
  });
}

async function updateCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;
  updateUI(tab?.url || '');
}

function updateUI(url) {
  // URL表示（短縮）
  elements.currentUrl.textContent = url.length > 60 ? url.substring(0, 60) + '...' : url;

  // リセット
  isSupportedPage = false;
  isSellerPage = false;
  currentSource = null;
  elements.btnSubmit.disabled = true;
  elements.btnBulk.disabled = true;

  // 商品ページチェック
  for (const { pattern, source, name } of SUPPORTED_PATTERNS) {
    if (pattern.test(url)) {
      isSupportedPage = true;
      currentSource = source;
      elements.pageStatus.innerHTML = `
        <span class="status-badge supported">
          <span class="status-dot"></span>
          <span>${name} - 対応</span>
        </span>
      `;
      elements.btnSubmit.disabled = false;
      return;
    }
  }

  // セラーページチェック
  for (const { pattern, source, name } of SELLER_PATTERNS) {
    if (pattern.test(url)) {
      isSellerPage = true;
      currentSource = source;
      elements.pageStatus.innerHTML = `
        <span class="status-badge supported">
          <span class="status-dot"></span>
          <span>${name} - 一括取得可能</span>
        </span>
      `;
      elements.btnBulk.disabled = false;
      return;
    }
  }

  // 非対応ページ
  elements.pageStatus.innerHTML = `
    <span class="status-badge unsupported">
      <span class="status-dot"></span>
      <span>非対応ページ</span>
    </span>
  `;
}

function setupEventListeners() {
  // マーケットプレイス選択
  document.querySelectorAll('.marketplace-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.marketplace-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      btn.querySelector('input').checked = true;
    });
  });

  // テーマ切替
  elements.btnTheme.addEventListener('click', toggleTheme);

  // 更新ボタン
  elements.btnRefresh.addEventListener('click', async () => {
    await checkConnection();
    await loadTemplates();
    await updateCurrentTab();
    await loadRecentItems();
  });

  // 設定パネル
  elements.btnSettings.addEventListener('click', () => {
    const isVisible = elements.settingsPanel.style.display !== 'none';
    elements.settingsPanel.style.display = isVisible ? 'none' : 'block';
  });

  // API URL変更
  elements.apiUrl.addEventListener('change', async () => {
    await chrome.storage.local.set({ apiUrl: elements.apiUrl.value });
    await checkConnection();
    await loadTemplates();
    showMessage('API URLを保存しました', 'success');
  });

  // 利益率変更
  elements.profitRate.addEventListener('change', async () => {
    await chrome.storage.local.set({ profitRate: parseInt(elements.profitRate.value) });
  });

  // 出品リクエスト送信
  elements.btnSubmit.addEventListener('click', handleSubmit);

  // セラー一括取得
  elements.btnBulk.addEventListener('click', handleBulkSubmit);

  // タブ切替検知
  chrome.tabs.onActivated.addListener(async () => {
    await updateCurrentTab();
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.url && currentTab && tabId === currentTab.id) {
      await updateCurrentTab();
    }
  });
}

async function toggleTheme() {
  const settings = await chrome.storage.local.get(['theme']);
  const currentTheme = settings.theme || 'system';

  const themes = ['system', 'light', 'dark'];
  const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
  const newTheme = themes[nextIndex];

  await chrome.storage.local.set({ theme: newTheme });
  applyTheme(newTheme);
}

async function handleSubmit() {
  if (!isSupportedPage || !currentTab || !isConnected) return;

  const apiUrl = elements.apiUrl.value;
  const marketplace = document.querySelector('input[name="marketplace"]:checked').value;
  const templateId = elements.templateSelect.value;

  elements.btnSubmit.disabled = true;
  const originalText = elements.btnSubmit.innerHTML;
  elements.btnSubmit.innerHTML = '<span class="spinner"></span> 送信中...';
  showMessage('リクエストを送信中...', 'loading');

  try {
    const response = await fetch(`${apiUrl}/api/products/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: currentTab.url,
        source: currentSource,
        marketplace: marketplace === 'both' ? ['joom', 'ebay'] : [marketplace],
        templateId: templateId || undefined,
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
    showMessage(`ジョブを登録しました (ID: ${result.data?.jobId || result.jobId})`, 'success');
    await loadRecentItems();
  } catch (error) {
    showMessage(`エラー: ${error.message}`, 'error');
  } finally {
    elements.btnSubmit.disabled = false;
    elements.btnSubmit.innerHTML = originalText;
  }
}

async function handleBulkSubmit() {
  if (!isSellerPage || !currentTab || !isConnected) return;

  const apiUrl = elements.apiUrl.value;
  const marketplace = document.querySelector('input[name="marketplace"]:checked').value;
  const templateId = elements.templateSelect.value;

  elements.btnBulk.disabled = true;
  const originalText = elements.btnBulk.innerHTML;
  elements.btnBulk.innerHTML = '<span class="spinner"></span> 取得中...';
  showMessage('セラー情報を取得中...', 'loading');

  // プログレス表示
  elements.progressSection.classList.add('visible');
  bulkProgress = { current: 0, total: 0 };
  updateProgress();

  try {
    const response = await fetch(`${apiUrl}/api/products/scrape-seller`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: currentTab.url,
        source: currentSource,
        marketplace: marketplace === 'both' ? ['joom', 'ebay'] : [marketplace],
        templateId: templateId || undefined,
        options: {
          processImages: true,
          translate: true,
          limit: 50,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'リクエストに失敗しました');
    }

    const result = await response.json();
    const count = result.data?.count || result.count || 0;
    bulkProgress.total = count;
    updateProgress();

    showMessage(`${count}件のジョブを登録しました`, 'success');

    // プログレス監視開始
    if (count > 0) {
      startBulkProgressPolling(result.data?.batchId || result.batchId);
    }
  } catch (error) {
    showMessage(`エラー: ${error.message}`, 'error');
    elements.progressSection.classList.remove('visible');
  } finally {
    elements.btnBulk.disabled = false;
    elements.btnBulk.innerHTML = originalText;
  }
}

function updateProgress() {
  const { current, total } = bulkProgress;
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  elements.progressBar.style.width = `${percent}%`;
  elements.progressText.textContent = `${current} / ${total} 件完了`;
}

async function startBulkProgressPolling(batchId) {
  if (!batchId) return;

  const apiUrl = elements.apiUrl.value;
  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/jobs/batch/${batchId}/progress`);
      if (response.ok) {
        const result = await response.json();
        bulkProgress.current = result.data?.completed || 0;
        updateProgress();

        if (bulkProgress.current >= bulkProgress.total) {
          clearInterval(pollInterval);
          setTimeout(() => {
            elements.progressSection.classList.remove('visible');
          }, 2000);
        }
      }
    } catch {
      // 無視
    }
  }, 2000);

  // 最大5分で停止
  setTimeout(() => {
    clearInterval(pollInterval);
    elements.progressSection.classList.remove('visible');
  }, 300000);
}

async function loadRecentItems() {
  if (!isConnected) return;

  const apiUrl = elements.apiUrl.value;
  try {
    const response = await fetch(`${apiUrl}/api/products?limit=5&sortBy=createdAt&sortOrder=desc`);
    if (response.ok) {
      const result = await response.json();
      renderRecentItems(result.data || []);
    }
  } catch {
    // 無視
  }
}

function renderRecentItems(items) {
  if (items.length === 0) {
    elements.recentList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-text">まだ登録がありません</div>
      </div>
    `;
    return;
  }

  elements.recentList.innerHTML = items.map(item => `
    <div class="recent-item">
      <img class="recent-thumb" src="${item.images?.[0] || item.processedImages?.[0] || ''}"
           alt="" onerror="this.style.display='none'">
      <div class="recent-info">
        <div class="recent-title">${escapeHtml(item.title || '無題')}</div>
        <div class="recent-meta">¥${item.price?.toLocaleString() || '---'}</div>
      </div>
      <span class="recent-status ${item.status?.toLowerCase()}">${getStatusLabel(item.status)}</span>
    </div>
  `).join('');
}

function getStatusLabel(status) {
  const labels = {
    PENDING: '待機中',
    PROCESSING: '処理中',
    READY: '準備完了',
    LISTED: '出品済',
    SOLD: '売却済',
    FAILED: 'エラー',
  };
  return labels[status] || status || '不明';
}

function showMessage(text, type) {
  elements.message.innerHTML = type === 'loading'
    ? `<span class="spinner"></span> ${escapeHtml(text)}`
    : escapeHtml(text);
  elements.message.className = `message visible ${type}`;

  if (type !== 'loading') {
    setTimeout(() => {
      elements.message.classList.remove('visible');
    }, 5000);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function startPolling() {
  // 30秒ごとに最新データを取得
  setInterval(async () => {
    await checkConnection();
    if (isConnected) {
      await loadRecentItems();
    }
  }, 30000);

  // 初回読み込み
  loadRecentItems();
}

// Universal Product Scraper - Background Script
// Webhook送信とメッセージ処理

console.log('Background script loaded (Universal Scraper)');

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'exportToSheet') {
    handleExportToSheet(request)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンスを示す
  }

  if (request.action === 'verifyWebhook') {
    verifyWebhookUrl(request.webhookUrl, request.sheetName)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'exportToRakuda') {
    handleExportToRakuda(request, sender)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'verifyRakudaApi') {
    verifyRakudaApi(request.apiUrl)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * Google Apps Script WebhookにデータをPOST
 */
async function handleExportToSheet(request) {
  try {
    const { webhookUrl, sheetName, values } = request;

    if (!webhookUrl) {
      throw new Error('Webhook URLが設定されていません');
    }

    console.log('📤 バックグラウンド：データ送信開始');
    console.log('Webhook URL:', webhookUrl);
    console.log('Sheet Name:', sheetName);
    console.log('Values array length:', values.length);

    // Apps Script WebhookにPOSTリクエスト
    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors', // CORSエラー回避
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values,
        sheetName: sheetName || 'インポート用'
      })
    });

    // no-corsモードでは詳細なレスポンスが取得できないため、
    // エラーがなければ成功と見なす
    console.log('✅ データ送信成功');

    return {
      success: true,
      message: `${sheetName}に追加しました`
    };

  } catch (error) {
    console.error('❌ エクスポートエラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Webhook URLの検証
 */
async function verifyWebhookUrl(webhookUrl, sheetName) {
  try {
    if (!webhookUrl) {
      throw new Error('Webhook URLが入力されていません');
    }

    // URLの形式チェック
    if (!webhookUrl.includes('script.google.com') &&
        !webhookUrl.includes('script.googleusercontent.com')) {
      throw new Error('正しいGoogle Apps Script URLではありません');
    }

    // テストデータを送信
    const testData = {
      values: Array(26).fill('テスト'), // 共通6項目 + フリマ11項目 + キーワード1項目 + 画像URLダミー8個
      sheetName: sheetName || 'インポート用'
    };

    console.log('🧪 Webhook接続テスト:', webhookUrl);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    // no-corsモードではレスポンスの詳細は取得できないが、
    // エラーがなければ成功と見なす
    return {
      success: true,
      message: `接続テスト成功！「${sheetName}」シートを確認してください。`
    };

  } catch (error) {
    console.error('❌ 検証エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * RAKUDA APIにCSV形式のデータを送信
 * リクエスト: { apiUrl, data, platform }
 */
async function handleExportToRakuda(request, sender) {
  const { apiUrl, data, platform } = request || {};
  if (!apiUrl) {
    throw new Error('RAKUDA API URLが設定されていません');
  }
  if (!data) {
    throw new Error('送信データがありません');
  }

  // プラットフォーム判定
  const mapPlatform = (p) => {
    if (!p) return 'UNKNOWN';
    const key = (p || '').toString().toLowerCase();
    if (key.includes('mercari')) return 'MERCARI';
    if (key === 'yahoo' || key.includes('yahoo') && key.includes('auction')) return 'YAHOO_AUCTION';
    if (key.includes('paypay')) return 'PAYPAY_FLEA';
    if (key.includes('fril') || key.includes('rakuma')) return 'RAKUMA';
    if (key.includes('amazon')) return 'AMAZON';
    if (key.includes('rakuten')) return 'RAKUTEN';
    if (key.includes('ebay')) return 'EBAY';
    if (key === 'yahoo') return 'YAHOO_AUCTION';
    return key.toUpperCase();
  };

  const sourceType = mapPlatform(platform);

  // CSVヘルパ
  const csvEscape = (val) => {
    const s = (val ?? '').toString();
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  // 値の整形
  // とりこみ君のプラットフォーム別データ構造:
  //   メルカリ: name (タイトル), url (商品ID)
  //   eBay: title, Amazon: title, 楽天: title 等
  const title = data.title || data.name || '';
  const description = data.description || data.details || '';
  // data.url は商品IDの場合があるので、sender.tab.url（実際のページURL）を優先
  const sourceUrl = (sender && sender.tab && sender.tab.url) || data.pageUrl || '';
  const condition = data.condition || '';
  const priceRaw = (data.price ?? '').toString();
  const price = priceRaw.replace(/[^0-9.]/g, '');
  let images = '';
  if (Array.isArray(data.imageUrl)) {
    images = data.imageUrl.filter(Boolean).join(';');
  } else if (typeof data.imageUrl === 'string') {
    images = data.imageUrl.split(',').map(s => s.trim()).filter(Boolean).join(';');
  }

  const headers = ['title','price','description','sourceUrl','condition','images'];
  const row = [title, price, description, sourceUrl, condition, images];
  const csv = headers.map(csvEscape).join(',') + "\n" + row.map(csvEscape).join(',');

  console.log('📤 RAKUDA CSV送信:', { csv, sourceType, title, price, sourceUrl });

  // 送信
  const url = apiUrl.replace(/\/$/, '') + '/api/products/import';
  const body = { csv, sourceType };

  try {
    const res = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const ok = res.ok;
    let json = null;
    try {
      json = await res.json();
    } catch (_) {
      // ignore parse error
    }

    if (!ok) {
      console.error('❌ RAKUDA APIエラー詳細:', JSON.stringify(json, null, 2));
      const errDetails = json?.errors?.map(e => e.message).join(', ') || '';
      const msg = (json?.message || json?.error || `HTTP ${res.status}`) + (errDetails ? ` (${errDetails})` : '');
      throw new Error(msg);
    }

    return {
      success: true,
      message: 'RAKUDAに送信しました',
      response: json || null
    };
  } catch (err) {
    console.error('❌ RAKUDA送信エラー:', err);
    return { success: false, error: err.message };
  }
}

/**
 * RAKUDA APIの接続確認
 */
async function verifyRakudaApi(apiUrl) {
  if (!apiUrl) {
    throw new Error('RAKUDA API URLが入力されていません');
  }
  const url = apiUrl.replace(/\/$/, '') + '/api/health';
  try {
    const res = await fetch(url, { method: 'GET', mode: 'cors' });
    if (!res.ok) {
      throw new Error(`接続失敗: HTTP ${res.status}`);
    }
    let json = null;
    try { json = await res.json(); } catch (_) {}
    return { success: true, message: '接続テスト成功', response: json };
  } catch (error) {
    console.error('❌ RAKUDA接続エラー:', error);
    return { success: false, error: error.message };
  }
}

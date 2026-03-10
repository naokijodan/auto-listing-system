// Universal Product Scraper - Popup Script
// DOMが完全に読み込まれてから実行
document.addEventListener('DOMContentLoaded', function() {
  const openOptionsBtn = document.getElementById('openOptions');
  const statusEl = document.getElementById('connectionStatus');

  if (openOptionsBtn) {
    console.log('✅ 設定ボタンが見つかりました');

    openOptionsBtn.addEventListener('click', function() {
      console.log('🖱️ 設定ボタンがクリックされました');

      try {
        if (chrome.runtime && chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage(function() {
            if (chrome.runtime.lastError) {
              console.error('❌ エラー:', chrome.runtime.lastError);
              alert('設定ページを開けませんでした: ' + chrome.runtime.lastError.message);
            } else {
              console.log('✅ 設定ページを開きました');
            }
          });
        } else {
          console.error('❌ chrome.runtime.openOptionsPage が利用できません');
          // 代替手段：直接options.htmlを開く
          chrome.tabs.create({ url: 'options.html' });
        }
      } catch (error) {
        console.error('❌ 例外発生:', error);
        alert('エラーが発生しました: ' + error.message);
      }
    });
  } else {
    console.error('❌ 設定ボタンが見つかりません');
  }

  // 接続状態の表示
  (async () => {
    try {
      const s = await chrome.storage.sync.get({ exportMode: 'rakuda', rakudaApiUrl: 'https://api.rakuda.dev', spreadsheets: [] });
      const mode = s.exportMode || 'rakuda';
      const parts = [];
      if (mode === 'rakuda') {
        parts.push(`RAKUDA API 接続中 (${s.rakudaApiUrl})`);
      } else if (mode === 'sheets') {
        parts.push('Sheets 接続中');
      } else {
        parts.push(`RAKUDA API 接続中 (${s.rakudaApiUrl})`);
        parts.push('Sheets 接続中');
      }
      if (statusEl) statusEl.textContent = parts.join(' / ');
    } catch (e) {
      if (statusEl) statusEl.textContent = '接続状態の取得に失敗しました';
    }
  })();
});

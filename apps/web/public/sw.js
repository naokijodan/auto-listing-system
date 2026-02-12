/**
 * RAKUDA Service Worker
 * Phase 75: PWA対応 - オフラインキャッシュとプッシュ通知
 */

const CACHE_NAME = 'rakuda-v1';
const OFFLINE_URL = '/offline';

// キャッシュするリソース
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// APIキャッシュ設定
const API_CACHE_NAME = 'rakuda-api-v1';
const API_CACHE_DURATION = 5 * 60 * 1000; // 5分

// インストール時にキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // 即座にアクティブ化
  self.skipWaiting();
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // 即座にクライアントをコントロール
  self.clients.claim();
});

// フェッチリクエストのハンドリング
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // APIリクエストのハンドリング
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // ナビゲーションリクエスト（HTML）
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // その他のリクエスト（静的アセット）
  event.respondWith(handleStaticRequest(request));
});

// APIリクエストのハンドリング（Network First）
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);

    // GETリクエストのみキャッシュ
    if (request.method === 'GET' && response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      const responseToCache = response.clone();

      // キャッシュにタイムスタンプを追加
      const headers = new Headers(responseToCache.headers);
      headers.append('sw-cached-at', Date.now().toString());

      cache.put(request, new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers,
      }));
    }

    return response;
  } catch (error) {
    // オフライン時はキャッシュから返す
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // キャッシュの有効期限チェック
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      if (cachedAt && Date.now() - parseInt(cachedAt) < API_CACHE_DURATION) {
        return cachedResponse;
      }
    }

    // オフラインエラーを返す
    return new Response(JSON.stringify({
      success: false,
      error: 'Offline - データを取得できません',
      offline: true,
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ナビゲーションリクエストのハンドリング（Network First）
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // オフライン時はオフラインページを返す
    const cachedOffline = await caches.match(OFFLINE_URL);
    if (cachedOffline) {
      return cachedOffline;
    }

    // キャッシュされたページを返す
    const cachedPage = await caches.match(request);
    if (cachedPage) {
      return cachedPage;
    }

    // フォールバック
    return new Response('Offline', { status: 503 });
  }
}

// 静的リクエストのハンドリング（Cache First）
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    // 成功したらキャッシュに追加
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// プッシュ通知の受信
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || data.message,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      ...data,
    },
    actions: data.actions || [
      { action: 'open', title: '開く' },
      { action: 'close', title: '閉じる' },
    ],
    tag: data.tag || 'rakuda-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'RAKUDA', options)
  );
});

// 通知のクリック
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 既存のウィンドウがあればフォーカス
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // なければ新しいウィンドウを開く
      return clients.openWindow(url);
    })
  );
});

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
  if (event.tag === 'sync-shipments') {
    event.waitUntil(syncShipments());
  }
});

// 注文データの同期
async function syncOrders() {
  try {
    const response = await fetch('/api/orders?limit=10');
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put('/api/orders?limit=10', response.clone());
    }
  } catch (error) {
    console.error('[SW] Failed to sync orders:', error);
  }
}

// 発送データの同期
async function syncShipments() {
  try {
    const response = await fetch('/api/shipments/pending');
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put('/api/shipments/pending', response.clone());
    }
  } catch (error) {
    console.error('[SW] Failed to sync shipments:', error);
  }
}

console.log('[SW] Service Worker loaded');

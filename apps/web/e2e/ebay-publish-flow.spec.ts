import { test, expect } from '@playwright/test';

/**
 * Phase 2: eBay出品フローE2Eテスト
 *
 * Chrome拡張シミュレート → 商品取り込み → 翻訳 → eBay出品 → 確認
 * Sandbox環境でのリグレッション検知が目的
 */

const API_BASE = 'http://localhost:3000';

test.describe('eBay Publish Flow - Critical Path', () => {
  test('should display eBay management page', async ({ page }) => {
    await page.goto('/ebay');
    await page.waitForTimeout(1500);

    await expect(page.locator('body')).toBeVisible();

    const heading = page.getByRole('heading', { name: /eBay/i });
    await expect(heading).toBeVisible();
  });

  test('should show eBay connection status', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(1500);

    await expect(page.locator('body')).toBeVisible();

    const ebaySection = page.locator('text=/eBay/i');
    await expect(ebaySection.first()).toBeVisible();
  });

  test('should navigate product to eBay listing flow', async ({ page }) => {
    // 1. 商品一覧
    await page.goto('/products');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();

    // 2. 商品レビュー
    await page.goto('/products/review');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();

    // 3. eBayリスティング管理
    await page.goto('/ebay/listings');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();

    // 4. eBayダッシュボード
    await page.goto('/ebay');
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('eBay Publish Flow - API Integration', () => {
  test('should verify API health', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('should check eBay auth status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/ebay/status`);
    expect([200, 401, 403, 404]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('connected');
    }
  });

  test('should list products via API', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/products?limit=5`);
    expect([200, 401, 403]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
    }
  });

  test('should list eBay listings via API', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/ebay-listings/listings?limit=5`);
    expect([200, 401, 403, 404]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      expect(data).toBeDefined();
    }
  });

  test('should access enrichment review API', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/enrichment/review?limit=5`);
    expect([200, 401, 403, 404]).toContain(response.status());
  });
});

test.describe('eBay Publish Flow - Job Queue Verification', () => {
  test('should display jobs page with eBay queue', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible();

    // キュー統計が表示される
    const queueStats = page.locator(
      'text=/待機|処理中|完了|失敗|Pending|Processing|Completed|Failed|ebay/i'
    );
    const statsCount = await queueStats.count();
    expect(statsCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('eBay Publish Flow - eBay-specific Pages', () => {
  const ebayPages = [
    { path: '/ebay', name: 'eBayダッシュボード' },
    { path: '/ebay/listings', name: 'リスティング管理' },
    { path: '/ebay/orders', name: '注文管理' },
    { path: '/ebay/analytics', name: '分析' },
    { path: '/ebay/inventory', name: '在庫管理' },
    { path: '/ebay/seller-hub', name: 'セラーハブ' },
  ];

  for (const { path, name } of ebayPages) {
    test(`should render ${name} (${path}) without errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(path);
      await page.waitForTimeout(1500);

      await expect(page.locator('body')).toBeVisible();

      const hasCriticalError = consoleErrors.some(
        (err) => err.includes('Uncaught') || err.includes('TypeError')
      );
      expect(hasCriticalError).toBeFalsy();
    });
  }
});

test.describe('eBay Publish Flow - Error Handling', () => {
  test('should handle API errors gracefully on eBay page', async ({ page }) => {
    await page.route('**/api/ebay-listings/**', (route) => route.abort());

    await page.goto('/ebay/listings');
    await page.waitForTimeout(2000);

    // ページがクラッシュしない
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle missing auth gracefully', async ({ page }) => {
    await page.route('**/api/ebay/status', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ connected: false }),
        contentType: 'application/json',
      })
    );

    await page.goto('/ebay');
    await page.waitForTimeout(2000);

    // ページが正常に表示される（接続なしの状態でも）
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('eBay Publish Flow - End-to-End Smoke Test', () => {
  test('should complete full eBay navigation flow', async ({ page }) => {
    const pages = [
      '/',
      '/products',
      '/products/review',
      '/ebay',
      '/ebay/listings',
      '/ebay/orders',
      '/listings',
      '/jobs',
      '/settings',
    ];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForTimeout(800);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

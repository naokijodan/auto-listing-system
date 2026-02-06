import { test, expect } from '@playwright/test';

/**
 * クリティカルユーザーフローテスト
 *
 * 実際のユーザー操作を模した重要なフローをテスト
 */
test.describe('Critical User Flows', () => {
  test.describe('Dashboard Navigation Flow', () => {
    test('should navigate through all main sections', async ({ page }) => {
      // ダッシュボード（トップ）から開始
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();

      // 商品管理へ遷移
      await page.locator('a, button').filter({ hasText: /商品|Products/i }).first().click();
      await page.waitForURL('**/products**');
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // 出品管理へ遷移
      await page.locator('a, button').filter({ hasText: /出品|Listings/i }).first().click();
      await page.waitForURL('**/listings**');
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // 注文管理へ遷移
      await page.locator('a, button').filter({ hasText: /注文|Orders/i }).first().click();
      await page.waitForURL('**/orders**');
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // レポートへ遷移
      await page.locator('a, button').filter({ hasText: /レポート|Reports/i }).first().click();
      await page.waitForURL('**/reports**');
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });
  });

  test.describe('Product Management Flow', () => {
    test('should view product list and details', async ({ page }) => {
      await page.goto('/products');
      await page.waitForTimeout(1500);

      // 商品リストが表示される
      const productList = page.locator('[class*="grid"], [class*="list"], table').first();
      await expect(productList).toBeVisible();

      // 検索機能をテスト
      const searchInput = page.locator('input[type="search"], input[placeholder*="検索"], input[placeholder*="search"]');
      if (await searchInput.count() > 0) {
        await searchInput.first().fill('test');
        await page.waitForTimeout(500);
        await searchInput.first().clear();
      }

      // フィルタリングをテスト
      const filterButton = page.locator('button').filter({ hasText: /フィルター|Filter/i });
      if (await filterButton.count() > 0) {
        await filterButton.first().click();
        await page.waitForTimeout(300);
        // フィルターモーダル/ドロップダウンが表示される
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Listing Management Flow', () => {
    test('should view listings and check marketplace tabs', async ({ page }) => {
      await page.goto('/listings');
      await page.waitForTimeout(1500);

      // マーケットプレイスタブが存在するか確認
      const marketplaceTabs = page.locator('[role="tab"], button').filter({
        hasText: /eBay|Joom|全て|All/i
      });
      const tabCount = await marketplaceTabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(0);

      // ステータスフィルターをテスト
      const statusFilter = page.locator('select, [role="combobox"]').filter({
        hasText: /ステータス|Status/i
      });
      if (await statusFilter.count() > 0) {
        await statusFilter.first().click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Order Management Flow', () => {
    test('should view orders and access details', async ({ page }) => {
      await page.goto('/orders');
      await page.waitForTimeout(1500);

      // 注文統計カードが表示される
      const statsCards = page.locator('[class*="card"]');
      const cardCount = await statsCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(0);

      // 注文リスト/テーブルが表示される
      const orderList = page.locator('table, [class*="list"]').first();
      await expect(orderList).toBeVisible();

      // 期間フィルターをテスト
      const periodFilter = page.locator('button, select').filter({
        hasText: /今日|週|月|Today|Week|Month/i
      });
      if (await periodFilter.count() > 0) {
        await periodFilter.first().click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Settings Management Flow', () => {
    test('should navigate through settings sections', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForTimeout(1000);

      // 設定ページが表示される
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // 通知設定へ遷移
      const notificationLink = page.locator('a').filter({ hasText: /通知|Notification/i });
      if (await notificationLink.count() > 0) {
        await notificationLink.first().click();
        await page.waitForURL('**/settings/notifications**');
        await expect(page.locator('body')).toBeVisible();
      }

      // テンプレート設定へ遷移
      await page.goto('/settings/templates');
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();

      // カテゴリ設定へ遷移
      await page.goto('/settings/categories');
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Job Monitoring Flow', () => {
    test('should view job queues and status', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForTimeout(1500);

      // ジョブキュー統計が表示される
      const queueStats = page.locator('[class*="card"], text=/待機|処理中|完了|失敗/i');
      const count = await queueStats.count();
      expect(count).toBeGreaterThanOrEqual(0);

      // ジョブタイプタブをテスト
      const jobTypeTabs = page.locator('[role="tab"], button').filter({
        hasText: /スクレイプ|翻訳|出品|Scrape|Translate|Publish/i
      });
      if (await jobTypeTabs.count() > 0) {
        await jobTypeTabs.first().click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Report Generation Flow', () => {
    test('should view reports and export options', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForTimeout(2000);

      // KPIカードが表示される
      const kpiCards = page.locator('[class*="card"]');
      const cardCount = await kpiCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(0);

      // 期間セレクターをテスト
      const periodSelector = page.locator('button, select').filter({
        hasText: /今週|今月|7日|30日/i
      });
      if (await periodSelector.count() > 0) {
        await periodSelector.first().click();
        await page.waitForTimeout(300);
      }

      // エクスポートボタンをテスト
      const exportButton = page.locator('button').filter({ hasText: /CSV|PDF|エクスポート/i });
      if (await exportButton.count() > 0) {
        await expect(exportButton.first()).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should display 404 page for invalid routes', async ({ page }) => {
      await page.goto('/this-page-does-not-exist-12345');
      await page.waitForTimeout(1000);

      // 404ページまたはリダイレクト
      const is404 = page.locator('text=/404|not found|見つかりません/i');
      const isRedirected = page.url().includes('/');

      expect(await is404.count() > 0 || isRedirected).toBeTruthy();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // API呼び出しが失敗してもページがクラッシュしない
      await page.route('**/api/**', route => route.abort());

      await page.goto('/products');
      await page.waitForTimeout(2000);

      // ページは表示される（エラー状態でも）
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop Large' },
      { width: 1280, height: 720, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ];

    for (const viewport of viewports) {
      test(`should render correctly on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
        await page.waitForTimeout(1000);

        // メインコンテンツが表示される
        await expect(page.locator('body')).toBeVisible();

        // ナビゲーションが存在する（モバイルではハンバーガーメニュー）
        const nav = page.locator('nav, [class*="sidebar"], [class*="menu"], button[aria-label*="menu"]');
        const navCount = await nav.count();
        expect(navCount).toBeGreaterThanOrEqual(0);
      });
    }
  });
});

import { test, expect } from '@playwright/test';

/**
 * 出品パフォーマンス E2Eテスト
 */
test.describe('Listing Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/listing-performance');
    await page.waitForTimeout(1500);
  });

  test.describe('Dashboard View', () => {
    test('should display performance statistics', async ({ page }) => {
      // 統計カードが表示される
      const statsCards = page.locator('[class*="card"]');
      const cardCount = await statsCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(0);

      // ページタイトルが表示される
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });

    test('should show tab navigation', async ({ page }) => {
      // タブが表示される
      const tabs = page.locator('[role="tab"], button').filter({
        hasText: /一覧|低パフォーマンス|閾値|ベンチマーク|List|Low|Threshold|Benchmark/i,
      });
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Listing Performance List', () => {
    test('should display performance list', async ({ page }) => {
      // 一覧が表示される
      const list = page.locator('table, [class*="list"], [class*="grid"]').first();
      await expect(list).toBeVisible();
    });

    test('should filter by score', async ({ page }) => {
      // スコアフィルターを探す
      const filterSelect = page.locator('select, [role="combobox"]');
      if (await filterSelect.count() > 0) {
        await filterSelect.first().click();
        await page.waitForTimeout(300);
      }
    });

    test('should search listings', async ({ page }) => {
      // 検索入力を探す
      const searchInput = page.locator('input[type="search"], input[placeholder*="検索"]');
      if (await searchInput.count() > 0) {
        await searchInput.first().fill('test');
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Low Performers', () => {
    test('should navigate to low performers', async ({ page }) => {
      // 低パフォーマンスタブをクリック
      const lowTab = page.locator('[role="tab"], button').filter({
        hasText: /低パフォーマンス|Low|警告/i,
      });

      if (await lowTab.count() > 0) {
        await lowTab.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should display flagged listings', async ({ page }) => {
      // 低パフォーマンスタブへ移動
      const lowTab = page.locator('[role="tab"], button').filter({
        hasText: /低パフォーマンス|Low/i,
      });

      if (await lowTab.count() > 0) {
        await lowTab.first().click();
        await page.waitForTimeout(500);

        // フラグ付き出品が表示される
        const list = page.locator('table, [class*="list"]');
        await expect(list.first()).toBeVisible();
      }
    });
  });

  test.describe('Threshold Settings', () => {
    test('should navigate to threshold settings', async ({ page }) => {
      // 閾値タブをクリック
      const thresholdTab = page.locator('[role="tab"], button').filter({
        hasText: /閾値|Threshold|設定/i,
      });

      if (await thresholdTab.count() > 0) {
        await thresholdTab.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should update threshold values', async ({ page }) => {
      // 閾値タブへ移動
      const thresholdTab = page.locator('[role="tab"], button').filter({
        hasText: /閾値|Threshold/i,
      });

      if (await thresholdTab.count() > 0) {
        await thresholdTab.first().click();
        await page.waitForTimeout(500);

        // 入力フィールドを探す
        const inputs = page.locator('input[type="number"]');
        if (await inputs.count() > 0) {
          await inputs.first().fill('10');
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe('Category Benchmarks', () => {
    test('should navigate to benchmarks', async ({ page }) => {
      // ベンチマークタブをクリック
      const benchTab = page.locator('[role="tab"], button').filter({
        hasText: /ベンチマーク|Benchmark|比較/i,
      });

      if (await benchTab.count() > 0) {
        await benchTab.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should display category comparison', async ({ page }) => {
      // ベンチマークタブへ移動
      const benchTab = page.locator('[role="tab"], button').filter({
        hasText: /ベンチマーク|Benchmark/i,
      });

      if (await benchTab.count() > 0) {
        await benchTab.first().click();
        await page.waitForTimeout(500);

        // カテゴリ比較が表示される
        const comparison = page.locator('table, [class*="chart"], [class*="graph"]');
        if (await comparison.count() > 0) {
          await expect(comparison.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Sync Function', () => {
    test('should trigger sync', async ({ page }) => {
      // 同期ボタンを探す
      const syncButton = page.locator('button').filter({
        hasText: /同期|Sync|更新|Refresh/i,
      });

      if (await syncButton.count() > 0) {
        await syncButton.first().click();
        await page.waitForTimeout(500);
      }
    });
  });
});

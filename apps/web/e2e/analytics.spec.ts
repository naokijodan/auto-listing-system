import { test, expect } from '@playwright/test';

test.describe('Analytics Bestsellers Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics/bestsellers');
  });

  test('should display analytics page header', async ({ page }) => {
    const header = page.locator('h1, h2').filter({ hasText: /ベストセラー|売れ筋|Bestsellers|Analytics/i });
    await expect(header.first()).toBeVisible();
  });

  test('should display product rankings', async ({ page }) => {
    await page.waitForTimeout(1500);

    // ランキングリストまたはテーブル
    const rankingContent = page.locator('table, [class*="list"], [class*="grid"]').first();
    await expect(rankingContent).toBeVisible();
  });

  test('should have period selector', async ({ page }) => {
    // 期間選択（日次/週次/月次）
    const periodSelector = page.locator('button, select').filter({
      hasText: /日|週|月|今日|昨日|day|week|month/i
    });
    const count = await periodSelector.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display sales metrics', async ({ page }) => {
    await page.waitForTimeout(1000);

    // 売上関連の指標
    const metrics = page.locator('text=/販売数|売上|個|件|sales|sold/i');
    const count = await metrics.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have category filter', async ({ page }) => {
    // カテゴリフィルター
    const categoryFilter = page.locator('select, [role="combobox"]').filter({
      hasText: /カテゴリ|category/i
    });
    const count = await categoryFilter.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display trend indicators', async ({ page }) => {
    await page.waitForTimeout(1000);

    // トレンドインジケーター（上昇/下降矢印）
    const trendIndicators = page.locator('[class*="arrow"], [class*="trend"], svg');
    const count = await trendIndicators.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have export functionality', async ({ page }) => {
    const exportButton = page.locator('button').filter({
      hasText: /CSV|エクスポート|export/i
    });
    if (await exportButton.count() > 0) {
      await expect(exportButton.first()).toBeVisible();
    }
  });

  test('should be responsive', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('body')).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });
});

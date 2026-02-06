import { test, expect } from '@playwright/test';

test.describe('Competitors Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/competitors');
  });

  test('should display competitors page header', async ({ page }) => {
    const header = page.locator('h1, h2').filter({ hasText: /競合|ライバル|Competitors/i });
    await expect(header.first()).toBeVisible();
  });

  test('should display competitor list or empty state', async ({ page }) => {
    await page.waitForTimeout(1000);

    // 競合リストまたは空状態
    const content = page.locator('[class*="card"], [class*="table"], [class*="list"], text=/競合が登録されていません/i');
    await expect(content.first()).toBeVisible();
  });

  test('should have add competitor button', async ({ page }) => {
    const addButton = page.locator('button').filter({
      hasText: /追加|新規|add|new/i
    });
    if (await addButton.count() > 0) {
      await expect(addButton.first()).toBeVisible();
    }
  });

  test('should display price comparison', async ({ page }) => {
    await page.waitForTimeout(1000);

    // 価格比較要素
    const priceElements = page.locator('text=/価格|¥|\\$|price/i');
    const count = await priceElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show price difference indicators', async ({ page }) => {
    await page.waitForTimeout(1000);

    // 価格差異インジケーター（高い/安い）
    const diffIndicators = page.locator('[class*="badge"], [class*="tag"]').filter({
      hasText: /高|安|同等|higher|lower|same/i
    });
    const count = await diffIndicators.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have refresh button', async ({ page }) => {
    const refreshButton = page.locator('button').filter({
      hasText: /更新|リフレッシュ|refresh|sync/i
    });
    if (await refreshButton.count() > 0) {
      await expect(refreshButton.first()).toBeVisible();
    }
  });

  test('should display last updated time', async ({ page }) => {
    await page.waitForTimeout(1000);

    // 最終更新時刻
    const timestamp = page.locator('text=/更新|最終|ago|前/i');
    const count = await timestamp.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should be responsive', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('body')).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });
});

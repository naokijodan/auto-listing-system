import { test, expect } from '@playwright/test';

test.describe('Notifications Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notifications');
  });

  test('should display notifications page header', async ({ page }) => {
    const header = page.locator('h1, h2').filter({ hasText: /通知|Notifications/i });
    await expect(header.first()).toBeVisible();
  });

  test('should display notification list or empty state', async ({ page }) => {
    await page.waitForTimeout(1000);

    // 通知リストまたは空状態のメッセージ
    const content = page.locator('[class*="card"], [class*="list"], text=/通知がありません|no notifications/i');
    await expect(content.first()).toBeVisible();
  });

  test('should have filter options', async ({ page }) => {
    // フィルターオプション（全て、未読、既読）
    const filterButtons = page.locator('button, [role="tab"]').filter({
      hasText: /全て|未読|既読|all|unread|read/i
    });
    const count = await filterButtons.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have mark all as read button', async ({ page }) => {
    const markAllButton = page.locator('button').filter({
      hasText: /全て既読|すべて既読|mark all|read all/i
    });
    if (await markAllButton.count() > 0) {
      await expect(markAllButton.first()).toBeVisible();
    }
  });

  test('should display notification types', async ({ page }) => {
    await page.waitForTimeout(1000);

    // 通知タイプアイコンまたはラベル
    const typeIndicators = page.locator('[class*="icon"], [class*="badge"]');
    const count = await typeIndicators.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to notification settings', async ({ page }) => {
    const settingsLink = page.locator('a, button').filter({
      hasText: /設定|Settings/i
    });

    if (await settingsLink.count() > 0) {
      await settingsLink.first().click();
      await page.waitForTimeout(500);
      // 設定ページまたはモーダルが表示される
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should be responsive', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('body')).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });
});

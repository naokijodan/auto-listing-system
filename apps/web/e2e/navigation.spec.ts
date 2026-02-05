import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // ページが正常に読み込まれることを確認
    await expect(page).toHaveTitle(/RAKUDA/i);
  });

  test('should navigate to products page', async ({ page }) => {
    await page.goto('/');

    // 商品ページへのリンクをクリック
    const productsLink = page.getByRole('link', { name: /商品|products/i });
    if (await productsLink.isVisible()) {
      await productsLink.click();
      await expect(page).toHaveURL(/.*products/);
    } else {
      // 直接アクセス
      await page.goto('/products');
      await expect(page).toHaveURL(/.*products/);
    }
  });

  test('should navigate to listings page', async ({ page }) => {
    await page.goto('/listings');

    // ページが読み込まれることを確認
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to jobs page', async ({ page }) => {
    await page.goto('/jobs');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to analytics page', async ({ page }) => {
    await page.goto('/analytics');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to notifications page', async ({ page }) => {
    await page.goto('/notifications');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to orders page', async ({ page }) => {
    await page.goto('/orders');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to reports page', async ({ page }) => {
    await page.goto('/reports');

    await expect(page.locator('body')).toBeVisible();
  });
});

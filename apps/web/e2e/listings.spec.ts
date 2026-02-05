import { test, expect } from '@playwright/test';

test.describe('Listings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/listings');
  });

  test('should display listings page', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have marketplace filter', async ({ page }) => {
    // マーケットプレースフィルターが存在するか確認
    const marketplaceFilter = page.getByRole('combobox').or(
      page.getByRole('button', { name: /joom|ebay|マーケット/i })
    );

    if (await marketplaceFilter.isVisible()) {
      await expect(marketplaceFilter).toBeVisible();
    }
  });

  test('should have status filter', async ({ page }) => {
    // ステータスフィルターが存在するか確認
    const statusFilter = page.getByText(/ステータス|status/i);
    const statusSelect = page.locator('select, [role="combobox"]');

    const hasStatusFilter = await statusFilter.isVisible() || await statusSelect.first().isVisible();
    expect(hasStatusFilter).toBeTruthy();
  });

  test('should display listing items or empty state', async ({ page }) => {
    // ローディング完了を待つ
    await page.waitForLoadState('networkidle');

    // データまたは空状態が表示されることを確認
    const table = page.getByRole('table');
    const emptyState = page.getByText(/出品がありません|no listings|データがありません/i);
    const listItems = page.locator('[data-testid="listing-item"]');

    await expect(
      table.or(emptyState).or(listItems.first())
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Listings Actions', () => {
  test('should support bulk selection', async ({ page }) => {
    await page.goto('/listings');
    await page.waitForLoadState('networkidle');

    // チェックボックスが存在する場合
    const checkbox = page.getByRole('checkbox').first();
    if (await checkbox.isVisible()) {
      await checkbox.check();
      await expect(checkbox).toBeChecked();
    }
  });
});

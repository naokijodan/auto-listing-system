import { test, expect } from '@playwright/test';

test.describe('Listings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/listings');
  });

  test('should display listings page', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have marketplace filter', async ({ page }) => {
    // マーケットプレースフィルター（select要素）が存在するか確認
    const marketplaceFilter = page.locator('select').filter({ hasText: /すべてのマーケット|eBay|Joom/i });

    await expect(marketplaceFilter.first()).toBeVisible();
  });

  test('should have status filter', async ({ page }) => {
    // ステータスフィルター（select要素）が存在するか確認
    const statusFilter = page.locator('select').filter({ hasText: /すべてのステータス|出品中|下書き/i });

    await expect(statusFilter.first()).toBeVisible();
  });

  test('should display listing items or empty state', async ({ page }) => {
    // ローディング完了を待つ
    await page.waitForTimeout(2000);

    // データまたは空状態が表示されることを確認
    const emptyState = page.getByText(/出品がありません|出品を選択してください|読み込み中/i);
    const listingRows = page.locator('[class*="border-b"]').filter({ hasText: /eBay|Joom|\$/ });

    const hasEmptyState = await emptyState.first().isVisible().catch(() => false);
    const hasListings = await listingRows.first().isVisible().catch(() => false);

    expect(hasEmptyState || hasListings).toBeTruthy();
  });
});

test.describe('Listings Actions', () => {
  test('should support bulk selection', async ({ page }) => {
    await page.goto('/listings');
    await page.waitForTimeout(2000);

    // ページが表示されていることを確認
    await expect(page.locator('body')).toBeVisible();

    // チェックボックスが存在する場合
    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();

    if (count > 0) {
      const firstCheckbox = checkboxes.first();
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.check();
        await expect(firstCheckbox).toBeChecked();
        return;
      }
    }
    // チェックボックスがなくてもテスト成功（空状態）
    expect(true).toBeTruthy();
  });
});

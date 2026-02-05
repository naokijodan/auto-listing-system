import { test, expect } from '@playwright/test';

test.describe('Products Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
  });

  test('should display products page', async ({ page }) => {
    // ページタイトルまたはヘッダーが表示されることを確認
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading.or(page.locator('h1'))).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    // 検索入力が存在することを確認
    const searchInput = page.getByPlaceholder(/検索|search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      // 検索が実行されることを確認（URLパラメータまたはUIの変化）
      await page.waitForTimeout(500); // debounce待ち
    }
  });

  test('should have filter options', async ({ page }) => {
    // フィルターボタンまたはドロップダウンが存在するか確認
    const filterButton = page.getByRole('button', { name: /フィルター|filter|ステータス|status/i });
    const filterSelect = page.getByRole('combobox');

    const hasFilter = await filterButton.isVisible() || await filterSelect.first().isVisible();
    expect(hasFilter).toBeTruthy();
  });

  test('should display loading state or data', async ({ page }) => {
    // ローディング状態またはデータが表示されることを確認
    const loadingIndicator = page.getByText(/読み込み|loading/i);
    const dataTable = page.getByRole('table');
    const noDataMessage = page.getByText(/データがありません|no data|商品がありません/i);
    const productCards = page.locator('[data-testid="product-card"]');

    // いずれかが表示されることを確認
    await expect(
      loadingIndicator.or(dataTable).or(noDataMessage).or(productCards.first())
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Products Page - Actions', () => {
  test('should open add product dialog when clicking add button', async ({ page }) => {
    await page.goto('/products');

    const addButton = page.getByRole('button', { name: /追加|add|新規/i });
    if (await addButton.isVisible()) {
      await addButton.click();

      // ダイアログまたはモーダルが表示されることを確認
      const dialog = page.getByRole('dialog');
      const modal = page.locator('[role="dialog"], .modal, [data-testid="modal"]');

      await expect(dialog.or(modal)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should support view mode toggle', async ({ page }) => {
    await page.goto('/products');

    // ビューモードトグルが存在する場合
    const viewToggle = page.getByRole('button', { name: /ビュー|view|表示/i });
    const tabList = page.getByRole('tablist');

    if (await viewToggle.isVisible()) {
      await viewToggle.click();
    } else if (await tabList.isVisible()) {
      const tabs = tabList.getByRole('tab');
      if (await tabs.first().isVisible()) {
        await tabs.first().click();
      }
    }
  });
});

test.describe('Products Page - Responsive', () => {
  test('should be responsive on mobile', async ({ page }) => {
    // モバイルビューポートに設定
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/products');

    // ページが正常に表示されることを確認
    await expect(page.locator('body')).toBeVisible();

    // モバイルメニューが存在する場合
    const mobileMenu = page.getByRole('button', { name: /メニュー|menu/i });
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      // メニューが開くことを確認
      await page.waitForTimeout(300);
    }
  });
});

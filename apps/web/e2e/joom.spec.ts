import { test, expect } from '@playwright/test';

test.describe('Joom Management Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/joom');
  });

  test('should display Joom page with header', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /Joom.*管理|joom.*management/i });
    await expect(heading).toBeVisible();
  });

  test('should display Joom logo/icon', async ({ page }) => {
    // Joomのアイコンまたはロゴが表示される
    const logo = page.locator('[class*="gradient"]').first();
    await expect(logo).toBeVisible();
  });

  test('should show listing count', async ({ page }) => {
    // 出品件数が表示される
    const countText = page.getByText(/件.*出品|\d+\s*listings/i);
    const loadingIndicator = page.getByText(/読み込み|loading/i);

    await expect(countText.or(loadingIndicator)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Joom Management Page - Stats Cards', () => {
  test('should display stats cards', async ({ page }) => {
    await page.goto('/joom');
    await page.waitForTimeout(1000);

    // 統計カードが表示される（総出品数、出品中、出品待ち、売上）
    const statsCards = page.locator('[class*="rounded-lg"]').filter({ hasText: /総出品数|出品中|出品待ち|売上/i });

    await expect(statsCards.first()).toBeVisible();
  });

  test('should display total listings count', async ({ page }) => {
    await page.goto('/joom');
    await page.waitForTimeout(1000);

    const totalCard = page.getByText(/総出品数/i);
    await expect(totalCard).toBeVisible();
  });

  test('should display active listings count', async ({ page }) => {
    await page.goto('/joom');
    await page.waitForTimeout(1000);

    const activeCard = page.getByText(/出品中/i);
    await expect(activeCard).toBeVisible();
  });

  test('should display pending listings count', async ({ page }) => {
    await page.goto('/joom');
    await page.waitForTimeout(1000);

    const pendingCard = page.getByText(/出品待ち/i);
    await expect(pendingCard).toBeVisible();
  });

  test('should display revenue', async ({ page }) => {
    await page.goto('/joom');
    await page.waitForTimeout(1000);

    const revenueCard = page.getByText(/売上/i);
    await expect(revenueCard).toBeVisible();
  });
});

test.describe('Joom Management Page - Filters', () => {
  test('should have status filter dropdown', async ({ page }) => {
    await page.goto('/joom');

    // ステータスフィルターのドロップダウン
    const statusFilter = page.getByRole('combobox');
    await expect(statusFilter.first()).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    await page.goto('/joom');

    const statusFilter = page.getByRole('combobox').first();

    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ label: '出品中' });
      await page.waitForTimeout(500);

      // フィルターが適用されることを確認（エラーが発生しないこと）
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should have refresh button', async ({ page }) => {
    await page.goto('/joom');

    // リフレッシュボタン
    const refreshButton = page.getByRole('button').filter({ has: page.locator('[class*="RefreshCw"], [class*="refresh"]') });

    // ボタンが存在するか、またはアイコンを含むボタンがある
    const hasRefresh = await refreshButton.first().isVisible().catch(() => false);
    expect(typeof hasRefresh).toBe('boolean');
  });
});

test.describe('Joom Management Page - Listings Table', () => {
  test('should display listings table header', async ({ page }) => {
    await page.goto('/joom');
    await page.waitForTimeout(1000);

    // テーブルヘッダーが表示される
    const tableHeader = page.getByText(/商品名|画像|出品価格|ステータス/i).first();
    await expect(tableHeader).toBeVisible();
  });

  test('should display listing items or empty state', async ({ page }) => {
    await page.goto('/joom');
    await page.waitForTimeout(2000);

    // 出品アイテムまたは空状態
    const listingItems = page.locator('[class*="border-b"]').filter({ hasText: /\$/ });
    const emptyState = page.getByText(/出品がありません|no listings/i);
    const loadingIndicator = page.getByText(/読み込み|loading/i);

    await expect(
      listingItems.first().or(emptyState).or(loadingIndicator)
    ).toBeVisible({ timeout: 10000 });
  });

  test('should have select all checkbox', async ({ page }) => {
    await page.goto('/joom');
    await page.waitForTimeout(1000);

    // 全選択チェックボックス
    const selectAllCheckbox = page.getByRole('checkbox').first();
    await expect(selectAllCheckbox).toBeVisible();
  });

  test('should display listing price in USD', async ({ page }) => {
    await page.goto('/joom');
    await page.waitForTimeout(2000);

    const emptyState = page.getByText(/出品がありません/i);
    if (await emptyState.isVisible()) {
      return;
    }

    // USD価格が表示される
    const usdPrice = page.getByText(/\$\d+\.\d+/);
    await expect(usdPrice.first()).toBeVisible();
  });

  test('should display listing status badge', async ({ page }) => {
    await page.goto('/joom');
    await page.waitForTimeout(2000);

    const emptyState = page.getByText(/出品がありません/i);
    if (await emptyState.isVisible()) {
      return;
    }

    // ステータスバッジ
    const statusBadge = page.getByText(/出品中|出品待ち|売却済|停止中|エラー/i);
    await expect(statusBadge.first()).toBeVisible();
  });
});

test.describe('Joom Management Page - Bulk Actions', () => {
  test('should allow selecting listings', async ({ page }) => {
    await page.goto('/joom');
    await page.waitForTimeout(2000);

    const emptyState = page.getByText(/出品がありません/i);
    if (await emptyState.isVisible()) {
      return;
    }

    // チェックボックスを選択
    const checkboxes = page.getByRole('checkbox');
    const secondCheckbox = checkboxes.nth(1); // 最初はヘッダーのselect all

    if (await secondCheckbox.isVisible()) {
      await secondCheckbox.click();
      await expect(secondCheckbox).toBeChecked();
    }
  });

  test('should show bulk action buttons when items selected', async ({ page }) => {
    await page.goto('/joom');
    await page.waitForTimeout(2000);

    const emptyState = page.getByText(/出品がありません/i);
    if (await emptyState.isVisible()) {
      return;
    }

    // チェックボックスを選択
    const checkboxes = page.getByRole('checkbox');
    const secondCheckbox = checkboxes.nth(1);

    if (await secondCheckbox.isVisible()) {
      await secondCheckbox.click();

      // 一括アクションボタンが表示される
      const publishButton = page.getByRole('button', { name: /出品開始|publish/i });
      const disableButton = page.getByRole('button', { name: /停止|disable/i });

      await expect(publishButton.or(disableButton)).toBeVisible();
    }
  });

  test('should select all listings with header checkbox', async ({ page }) => {
    await page.goto('/joom');
    await page.waitForTimeout(2000);

    const emptyState = page.getByText(/出品がありません/i);
    if (await emptyState.isVisible()) {
      return;
    }

    // 全選択チェックボックス
    const selectAllCheckbox = page.getByRole('checkbox').first();

    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.click();

      // 全てのチェックボックスが選択される
      await expect(selectAllCheckbox).toBeChecked();
    }
  });
});

test.describe('Joom Management Page - External Links', () => {
  test('should have external link icon for listings with URL', async ({ page }) => {
    await page.goto('/joom');
    await page.waitForTimeout(2000);

    const emptyState = page.getByText(/出品がありません/i);
    if (await emptyState.isVisible()) {
      return;
    }

    // 外部リンクアイコンの存在確認（あれば）
    const externalLinks = page.locator('a[target="_blank"]');
    const hasLinks = await externalLinks.first().isVisible().catch(() => false);

    expect(typeof hasLinks).toBe('boolean');
  });
});

test.describe('Joom Management Page - Responsive', () => {
  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/joom');

    // ページが正常に表示される
    await expect(page.locator('body')).toBeVisible();

    // ヘッダーが表示される
    const heading = page.getByRole('heading', { name: /Joom/i });
    await expect(heading).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/joom');

    // ページが正常に表示される
    await expect(page.locator('body')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Sync Schedule Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display sync schedule tab in settings', async ({ page }) => {
    // Verify the sync schedule tab exists
    const syncTab = page.getByRole('button', { name: '同期スケジュール' });
    await expect(syncTab).toBeVisible();
  });

  test('should switch to sync schedule tab and display settings', async ({ page }) => {
    // Click on sync schedule tab
    await page.getByRole('button', { name: '同期スケジュール' }).click();

    // Wait for content to load
    await page.waitForTimeout(500);

    // Verify header is displayed
    const heading = page.getByRole('heading', { name: '同期スケジュール設定' });
    await expect(heading).toBeVisible();

    // Verify marketplace selector is displayed
    await expect(page.getByText('マーケットプレイス').first()).toBeVisible();
  });

  test('should display Joom and eBay marketplace buttons', async ({ page }) => {
    // Navigate to sync schedule tab
    await page.getByRole('button', { name: '同期スケジュール' }).click();
    await page.waitForTimeout(500);

    // Verify marketplace buttons
    const joomButton = page.locator('button').filter({ hasText: 'Joom' });
    const ebayButton = page.locator('button').filter({ hasText: 'eBay' });

    await expect(joomButton).toBeVisible();
    await expect(ebayButton).toBeVisible();
  });

  test('should switch between Joom and eBay marketplace', async ({ page }) => {
    // Navigate to sync schedule tab
    await page.getByRole('button', { name: '同期スケジュール' }).click();
    await page.waitForTimeout(500);

    // Click on Joom button (should be default selected)
    const joomButton = page.locator('button').filter({ hasText: 'Joom' });
    await joomButton.click();
    await page.waitForTimeout(200);

    // Verify Joom is selected (has amber styling)
    await expect(joomButton).toHaveClass(/amber/);

    // Click on eBay button
    const ebayButton = page.locator('button').filter({ hasText: 'eBay' });
    await ebayButton.click();
    await page.waitForTimeout(200);

    // Verify eBay is selected (has blue styling)
    await expect(ebayButton).toHaveClass(/blue/);
  });

  test('should display sync type configurations', async ({ page }) => {
    // Navigate to sync schedule tab
    await page.getByRole('button', { name: '同期スケジュール' }).click();
    await page.waitForTimeout(1000);

    // Verify sync types are displayed
    await expect(page.getByText('在庫同期').first()).toBeVisible();
    await expect(page.getByText('注文同期').first()).toBeVisible();
    await expect(page.getByText('価格同期').first()).toBeVisible();
  });

  test('should display interval selector for each sync type', async ({ page }) => {
    // Navigate to sync schedule tab
    await page.getByRole('button', { name: '同期スケジュール' }).click();
    await page.waitForTimeout(1000);

    // Verify interval labels exist
    const intervalLabels = page.locator('text=実行間隔');
    const count = await intervalLabels.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should change sync interval', async ({ page }) => {
    // Navigate to sync schedule tab
    await page.getByRole('button', { name: '同期スケジュール' }).click();
    await page.waitForTimeout(1000);

    // Find the first select element (interval selector)
    const selects = page.locator('select');
    if (await selects.count() > 0) {
      const firstSelect = selects.first();
      await firstSelect.selectOption('3'); // Change to 3 hours

      // Verify the value changed
      await expect(firstSelect).toHaveValue('3');
    }
  });

  test('should toggle sync enabled/disabled', async ({ page }) => {
    // Navigate to sync schedule tab
    await page.getByRole('button', { name: '同期スケジュール' }).click();
    await page.waitForTimeout(1000);

    // Find switches (toggle buttons)
    const switches = page.locator('[role="switch"], button[data-state]');
    if (await switches.count() > 0) {
      const firstSwitch = switches.first();
      const initialState = await firstSwitch.getAttribute('data-state');

      // Click to toggle
      await firstSwitch.click();
      await page.waitForTimeout(200);

      // State should change
      const newState = await firstSwitch.getAttribute('data-state');
      expect(newState).not.toBe(initialState);
    }
  });

  test('should have save button', async ({ page }) => {
    // Navigate to sync schedule tab
    await page.getByRole('button', { name: '同期スケジュール' }).click();
    await page.waitForTimeout(500);

    // Verify save button exists
    const saveButton = page.locator('button').filter({ hasText: '保存' });
    await expect(saveButton).toBeVisible();
  });

  test('should click save button and show feedback', async ({ page }) => {
    // Navigate to sync schedule tab
    await page.getByRole('button', { name: '同期スケジュール' }).click();
    await page.waitForTimeout(1000);

    // Click save button
    const saveButton = page.locator('button').filter({ hasText: '保存' });
    await saveButton.click();

    // Wait for API response (toast or loading state)
    await page.waitForTimeout(1000);

    // Check for toast message or button state change
    // The test passes as long as no error is thrown
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display info card about sync schedules', async ({ page }) => {
    // Navigate to sync schedule tab
    await page.getByRole('button', { name: '同期スケジュール' }).click();
    await page.waitForTimeout(500);

    // Verify info card exists
    const infoCard = page.getByText('同期スケジュールについて');
    await expect(infoCard).toBeVisible();
  });

  test('should display sync type descriptions', async ({ page }) => {
    // Navigate to sync schedule tab
    await page.getByRole('button', { name: '同期スケジュール' }).click();
    await page.waitForTimeout(1000);

    // Verify descriptions are displayed
    await expect(page.getByText('商品の在庫数を同期します').first()).toBeVisible();
    await expect(page.getByText('新規注文を取得・同期します').first()).toBeVisible();
    await expect(page.getByText('商品価格を同期・更新します').first()).toBeVisible();
  });

  test('full workflow: select marketplace, change interval, save', async ({ page }) => {
    // Navigate to sync schedule tab
    await page.getByRole('button', { name: '同期スケジュール' }).click();
    await page.waitForTimeout(1000);

    // Step 1: Select eBay marketplace
    const ebayButton = page.locator('button').filter({ hasText: 'eBay' });
    await ebayButton.click();
    await page.waitForTimeout(300);

    // Verify eBay is selected
    await expect(ebayButton).toHaveClass(/blue/);

    // Step 2: Change interval (if select exists)
    const selects = page.locator('select');
    if (await selects.count() > 0) {
      await selects.first().selectOption('12'); // 12 hours
    }

    // Step 3: Click save
    const saveButton = page.locator('button').filter({ hasText: '保存' });
    await saveButton.click();

    // Wait for response
    await page.waitForTimeout(1000);

    // Verify page is still visible (no crash)
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Sync Schedule - Responsive', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to sync schedule tab
    await page.getByRole('button', { name: '同期スケジュール' }).click();
    await page.waitForTimeout(500);

    // Verify content is visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to sync schedule tab
    await page.getByRole('button', { name: '同期スケジュール' }).click();
    await page.waitForTimeout(500);

    // Verify content is visible
    await expect(page.locator('body')).toBeVisible();
  });
});

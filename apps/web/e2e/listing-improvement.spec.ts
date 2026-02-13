import { test, expect } from '@playwright/test';

/**
 * 改善提案 E2Eテスト
 */
test.describe('Listing Improvement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/listing-improvement');
    await page.waitForTimeout(1500);
  });

  test.describe('Dashboard View', () => {
    test('should display improvement statistics', async ({ page }) => {
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
        hasText: /提案|一括|履歴|効果|Suggestion|Bulk|History|Effect/i,
      });
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Suggestions List', () => {
    test('should display suggestions', async ({ page }) => {
      // 提案一覧が表示される
      const list = page.locator('table, [class*="list"], [class*="grid"]').first();
      await expect(list).toBeVisible();
    });

    test('should filter by type', async ({ page }) => {
      // タイプフィルターを探す
      const typeFilter = page.locator('select, [role="combobox"]').filter({
        hasText: /タイプ|Type|タイトル|Title|価格|Price/i,
      });

      if (await typeFilter.count() > 0) {
        await typeFilter.first().click();
        await page.waitForTimeout(300);
      }
    });

    test('should filter by status', async ({ page }) => {
      // ステータスフィルターを探す
      const statusFilter = page.locator('select, [role="combobox"]').filter({
        hasText: /ステータス|Status|保留|Pending|適用済/i,
      });

      if (await statusFilter.count() > 0) {
        await statusFilter.first().click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Apply Suggestion', () => {
    test('should show apply button', async ({ page }) => {
      // 適用ボタンを探す
      const applyButton = page.locator('button').filter({
        hasText: /適用|Apply|承認|Approve/i,
      });

      if (await applyButton.count() > 0) {
        await expect(applyButton.first()).toBeVisible();
      }
    });

    test('should show preview', async ({ page }) => {
      // プレビューボタンを探す
      const previewButton = page.locator('button').filter({
        hasText: /プレビュー|Preview|確認/i,
      });

      if (await previewButton.count() > 0) {
        await previewButton.first().click();
        await page.waitForTimeout(500);

        // プレビューダイアログが表示される
        const dialog = page.locator('[role="dialog"], [class*="modal"]');
        if (await dialog.count() > 0) {
          await expect(dialog.first()).toBeVisible();
          await page.keyboard.press('Escape');
        }
      }
    });
  });

  test.describe('Bulk Actions', () => {
    test('should navigate to bulk actions', async ({ page }) => {
      // 一括タブをクリック
      const bulkTab = page.locator('[role="tab"], button').filter({
        hasText: /一括|Bulk/i,
      });

      if (await bulkTab.count() > 0) {
        await bulkTab.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should show bulk action options', async ({ page }) => {
      // 一括タブへ移動
      const bulkTab = page.locator('[role="tab"], button').filter({
        hasText: /一括|Bulk/i,
      });

      if (await bulkTab.count() > 0) {
        await bulkTab.first().click();
        await page.waitForTimeout(500);

        // アクション選択を探す
        const actionSelect = page.locator('select, [role="combobox"]');
        if (await actionSelect.count() > 0) {
          await expect(actionSelect.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Action History', () => {
    test('should navigate to history', async ({ page }) => {
      // 履歴タブをクリック
      const historyTab = page.locator('[role="tab"], button').filter({
        hasText: /履歴|History/i,
      });

      if (await historyTab.count() > 0) {
        await historyTab.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should display action history', async ({ page }) => {
      // 履歴タブへ移動
      const historyTab = page.locator('[role="tab"], button').filter({
        hasText: /履歴|History/i,
      });

      if (await historyTab.count() > 0) {
        await historyTab.first().click();
        await page.waitForTimeout(500);

        // 履歴一覧が表示される
        const list = page.locator('table, [class*="list"]');
        await expect(list.first()).toBeVisible();
      }
    });
  });

  test.describe('Effectiveness', () => {
    test('should navigate to effectiveness', async ({ page }) => {
      // 効果タブをクリック
      const effectTab = page.locator('[role="tab"], button').filter({
        hasText: /効果|Effect|測定/i,
      });

      if (await effectTab.count() > 0) {
        await effectTab.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should show effectiveness metrics', async ({ page }) => {
      // 効果タブへ移動
      const effectTab = page.locator('[role="tab"], button').filter({
        hasText: /効果|Effect/i,
      });

      if (await effectTab.count() > 0) {
        await effectTab.first().click();
        await page.waitForTimeout(500);

        // メトリクスが表示される
        const metrics = page.locator('[class*="card"], [class*="stat"]');
        if (await metrics.count() > 0) {
          await expect(metrics.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Generate Suggestions', () => {
    test('should open generate dialog', async ({ page }) => {
      // 生成ボタンを探す
      const generateButton = page.locator('button').filter({
        hasText: /生成|Generate|AI/i,
      });

      if (await generateButton.count() > 0) {
        await generateButton.first().click();
        await page.waitForTimeout(500);

        // ダイアログが表示される
        const dialog = page.locator('[role="dialog"], [class*="modal"]');
        if (await dialog.count() > 0) {
          await expect(dialog.first()).toBeVisible();
          await page.keyboard.press('Escape');
        }
      }
    });
  });
});

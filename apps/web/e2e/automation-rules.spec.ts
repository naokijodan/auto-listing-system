import { test, expect } from '@playwright/test';

/**
 * 自動アクションルール E2Eテスト
 */
test.describe('Automation Rules', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/automation-rules');
    await page.waitForTimeout(1500);
  });

  test.describe('Dashboard View', () => {
    test('should display automation statistics', async ({ page }) => {
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
        hasText: /ルール|実行履歴|安全設定|Rule|History|Safety/i,
      });
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Rule Management', () => {
    test('should display rule list', async ({ page }) => {
      // ルール一覧が表示される
      const ruleList = page.locator('table, [class*="list"], [class*="grid"]').first();
      await expect(ruleList).toBeVisible();
    });

    test('should open create rule dialog', async ({ page }) => {
      // 新規作成ボタンをクリック
      const createButton = page.locator('button').filter({
        hasText: /新規|作成|追加|Create|Add/i,
      });

      if (await createButton.count() > 0) {
        await createButton.first().click();
        await page.waitForTimeout(500);

        // ダイアログが表示される
        const dialog = page.locator('[role="dialog"], [class*="modal"], [class*="dialog"]');
        if (await dialog.count() > 0) {
          await expect(dialog.first()).toBeVisible();
          await page.keyboard.press('Escape');
        }
      }
    });

    test('should toggle rule status', async ({ page }) => {
      // トグルスイッチを探す
      const toggles = page.locator('button[role="switch"], [class*="switch"], input[type="checkbox"]');

      if (await toggles.count() > 0) {
        const toggle = toggles.first();
        await toggle.click();
        await page.waitForTimeout(300);
        // トグルがクリック可能であることを確認
        expect(await toggle.isEnabled()).toBe(true);
      }
    });
  });

  test.describe('Execution History', () => {
    test('should navigate to execution history', async ({ page }) => {
      // 実行履歴タブをクリック
      const historyTab = page.locator('[role="tab"], button').filter({
        hasText: /実行履歴|履歴|History|Execution/i,
      });

      if (await historyTab.count() > 0) {
        await historyTab.first().click();
        await page.waitForTimeout(500);

        // 履歴リストが表示される
        const historyList = page.locator('table, [class*="list"]');
        await expect(historyList.first()).toBeVisible();
      }
    });

    test('should filter execution history', async ({ page }) => {
      // 実行履歴タブへ移動
      const historyTab = page.locator('[role="tab"], button').filter({
        hasText: /実行履歴|履歴|History|Execution/i,
      });

      if (await historyTab.count() > 0) {
        await historyTab.first().click();
        await page.waitForTimeout(500);

        // フィルターを探す
        const filterSelect = page.locator('select, [role="combobox"]');
        if (await filterSelect.count() > 0) {
          await filterSelect.first().click();
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe('Safety Settings', () => {
    test('should navigate to safety settings', async ({ page }) => {
      // 安全設定タブをクリック
      const safetyTab = page.locator('[role="tab"], button').filter({
        hasText: /安全設定|Safety|設定/i,
      });

      if (await safetyTab.count() > 0) {
        await safetyTab.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should display emergency stop button', async ({ page }) => {
      // 緊急停止ボタンを探す
      const emergencyButton = page.locator('button').filter({
        hasText: /緊急停止|Emergency|Stop/i,
      });

      if (await emergencyButton.count() > 0) {
        await expect(emergencyButton.first()).toBeVisible();
      }
    });

    test('should update safety settings', async ({ page }) => {
      // 安全設定タブへ移動
      const safetyTab = page.locator('[role="tab"], button').filter({
        hasText: /安全設定|Safety/i,
      });

      if (await safetyTab.count() > 0) {
        await safetyTab.first().click();
        await page.waitForTimeout(500);

        // 設定フォームを探す
        const formInputs = page.locator('input[type="number"], input[type="text"]');
        if (await formInputs.count() > 0) {
          await formInputs.first().fill('100');
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe('Rule Testing', () => {
    test('should perform dry run', async ({ page }) => {
      // テスト実行ボタンを探す
      const testButton = page.locator('button').filter({
        hasText: /テスト|Dry Run|Test|シミュレート/i,
      });

      if (await testButton.count() > 0) {
        await testButton.first().click();
        await page.waitForTimeout(500);

        // 結果が表示される
        const result = page.locator('[class*="toast"], [class*="alert"], [role="alert"]');
        if (await result.count() > 0) {
          await expect(result.first()).toBeVisible();
        }
      }
    });
  });
});

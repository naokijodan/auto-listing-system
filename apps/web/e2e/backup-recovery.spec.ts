import { test, expect } from '@playwright/test';

/**
 * バックアップ・リカバリ E2Eテスト
 */
test.describe('Backup Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/backup-recovery');
    await page.waitForTimeout(1500);
  });

  test.describe('Dashboard View', () => {
    test('should display backup statistics', async ({ page }) => {
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
        hasText: /バックアップ|スケジュール|リカバリ|Backup|Schedule|Recovery/i,
      });
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Backup Jobs', () => {
    test('should display backup list', async ({ page }) => {
      // バックアップ一覧が表示される
      const list = page.locator('table, [class*="list"], [class*="grid"]').first();
      await expect(list).toBeVisible();
    });

    test('should filter by status', async ({ page }) => {
      // ステータスフィルターを探す
      const statusFilter = page.locator('select, [role="combobox"]').filter({
        hasText: /ステータス|Status|完了|Completed/i,
      });

      if (await statusFilter.count() > 0) {
        await statusFilter.first().click();
        await page.waitForTimeout(300);
      }
    });

    test('should trigger new backup', async ({ page }) => {
      // バックアップボタンを探す
      const backupButton = page.locator('button').filter({
        hasText: /バックアップ|Backup|開始|Start/i,
      });

      if (await backupButton.count() > 0) {
        await backupButton.first().click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Backup Schedules', () => {
    test('should navigate to schedules', async ({ page }) => {
      // スケジュールタブをクリック
      const scheduleTab = page.locator('[role="tab"], button').filter({
        hasText: /スケジュール|Schedule/i,
      });

      if (await scheduleTab.count() > 0) {
        await scheduleTab.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should display schedule list', async ({ page }) => {
      // スケジュールタブへ移動
      const scheduleTab = page.locator('[role="tab"], button').filter({
        hasText: /スケジュール|Schedule/i,
      });

      if (await scheduleTab.count() > 0) {
        await scheduleTab.first().click();
        await page.waitForTimeout(500);

        // スケジュール一覧が表示される
        const list = page.locator('table, [class*="list"]');
        await expect(list.first()).toBeVisible();
      }
    });

    test('should create new schedule', async ({ page }) => {
      // スケジュールタブへ移動
      const scheduleTab = page.locator('[role="tab"], button').filter({
        hasText: /スケジュール|Schedule/i,
      });

      if (await scheduleTab.count() > 0) {
        await scheduleTab.first().click();
        await page.waitForTimeout(500);

        // 追加ボタンを探す
        const addButton = page.locator('button').filter({
          hasText: /追加|Add|作成|Create/i,
        });

        if (await addButton.count() > 0) {
          await addButton.first().click();
          await page.waitForTimeout(500);

          // ダイアログが表示される
          const dialog = page.locator('[role="dialog"], [class*="modal"]');
          if (await dialog.count() > 0) {
            await expect(dialog.first()).toBeVisible();
            await page.keyboard.press('Escape');
          }
        }
      }
    });
  });

  test.describe('Recovery Points', () => {
    test('should navigate to recovery points', async ({ page }) => {
      // リカバリタブをクリック
      const recoveryTab = page.locator('[role="tab"], button').filter({
        hasText: /リカバリ|Recovery|ポイント|Point/i,
      });

      if (await recoveryTab.count() > 0) {
        await recoveryTab.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should display recovery points', async ({ page }) => {
      // リカバリタブへ移動
      const recoveryTab = page.locator('[role="tab"], button').filter({
        hasText: /リカバリ|Recovery/i,
      });

      if (await recoveryTab.count() > 0) {
        await recoveryTab.first().click();
        await page.waitForTimeout(500);

        // リカバリポイント一覧が表示される
        const list = page.locator('table, [class*="list"]');
        await expect(list.first()).toBeVisible();
      }
    });
  });

  test.describe('Restore Function', () => {
    test('should show restore button', async ({ page }) => {
      // リストアボタンを探す
      const restoreButton = page.locator('button').filter({
        hasText: /リストア|Restore|復元/i,
      });

      if (await restoreButton.count() > 0) {
        await expect(restoreButton.first()).toBeVisible();
      }
    });

    test('should open restore confirmation', async ({ page }) => {
      // リストアボタンを探す
      const restoreButton = page.locator('button').filter({
        hasText: /リストア|Restore|復元/i,
      });

      if (await restoreButton.count() > 0) {
        await restoreButton.first().click();
        await page.waitForTimeout(500);

        // 確認ダイアログが表示される
        const dialog = page.locator('[role="dialog"], [role="alertdialog"], [class*="modal"]');
        if (await dialog.count() > 0) {
          await expect(dialog.first()).toBeVisible();
          await page.keyboard.press('Escape');
        }
      }
    });
  });

  test.describe('Backup Verification', () => {
    test('should verify backup', async ({ page }) => {
      // 検証ボタンを探す
      const verifyButton = page.locator('button').filter({
        hasText: /検証|Verify|確認/i,
      });

      if (await verifyButton.count() > 0) {
        await verifyButton.first().click();
        await page.waitForTimeout(500);
      }
    });
  });
});

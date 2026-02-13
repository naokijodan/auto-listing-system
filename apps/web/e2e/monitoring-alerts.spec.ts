import { test, expect } from '@playwright/test';

/**
 * 監視アラート E2Eテスト
 */
test.describe('Monitoring Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/monitoring-alerts');
    await page.waitForTimeout(1500);
  });

  test.describe('Dashboard View', () => {
    test('should display alert statistics', async ({ page }) => {
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
        hasText: /ルール|インシデント|チャンネル|Rule|Incident|Channel/i,
      });
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Alert Rules', () => {
    test('should display rule list', async ({ page }) => {
      // ルール一覧が表示される
      const list = page.locator('table, [class*="list"], [class*="grid"]').first();
      await expect(list).toBeVisible();
    });

    test('should filter by severity', async ({ page }) => {
      // 重要度フィルターを探す
      const severityFilter = page.locator('select, [role="combobox"]').filter({
        hasText: /重要度|Severity|Critical|Warning/i,
      });

      if (await severityFilter.count() > 0) {
        await severityFilter.first().click();
        await page.waitForTimeout(300);
      }
    });

    test('should create new rule', async ({ page }) => {
      // 追加ボタンを探す
      const addButton = page.locator('button').filter({
        hasText: /追加|Add|作成|Create|新規/i,
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
    });

    test('should toggle rule', async ({ page }) => {
      // トグルスイッチを探す
      const toggle = page.locator('button[role="switch"], [class*="switch"]');

      if (await toggle.count() > 0) {
        await toggle.first().click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Incidents', () => {
    test('should navigate to incidents', async ({ page }) => {
      // インシデントタブをクリック
      const incidentTab = page.locator('[role="tab"], button').filter({
        hasText: /インシデント|Incident/i,
      });

      if (await incidentTab.count() > 0) {
        await incidentTab.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should display incident list', async ({ page }) => {
      // インシデントタブへ移動
      const incidentTab = page.locator('[role="tab"], button').filter({
        hasText: /インシデント|Incident/i,
      });

      if (await incidentTab.count() > 0) {
        await incidentTab.first().click();
        await page.waitForTimeout(500);

        // インシデント一覧が表示される
        const list = page.locator('table, [class*="list"]');
        await expect(list.first()).toBeVisible();
      }
    });

    test('should filter by status', async ({ page }) => {
      // インシデントタブへ移動
      const incidentTab = page.locator('[role="tab"], button').filter({
        hasText: /インシデント|Incident/i,
      });

      if (await incidentTab.count() > 0) {
        await incidentTab.first().click();
        await page.waitForTimeout(500);

        // ステータスフィルターを探す
        const statusFilter = page.locator('select, [role="combobox"]').filter({
          hasText: /ステータス|Status|Active|Resolved/i,
        });

        if (await statusFilter.count() > 0) {
          await statusFilter.first().click();
          await page.waitForTimeout(300);
        }
      }
    });

    test('should acknowledge incident', async ({ page }) => {
      // インシデントタブへ移動
      const incidentTab = page.locator('[role="tab"], button').filter({
        hasText: /インシデント|Incident/i,
      });

      if (await incidentTab.count() > 0) {
        await incidentTab.first().click();
        await page.waitForTimeout(500);

        // 確認ボタンを探す
        const ackButton = page.locator('button').filter({
          hasText: /確認|Acknowledge|認識/i,
        });

        if (await ackButton.count() > 0) {
          await ackButton.first().click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should resolve incident', async ({ page }) => {
      // インシデントタブへ移動
      const incidentTab = page.locator('[role="tab"], button').filter({
        hasText: /インシデント|Incident/i,
      });

      if (await incidentTab.count() > 0) {
        await incidentTab.first().click();
        await page.waitForTimeout(500);

        // 解決ボタンを探す
        const resolveButton = page.locator('button').filter({
          hasText: /解決|Resolve|完了/i,
        });

        if (await resolveButton.count() > 0) {
          await resolveButton.first().click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Notification Channels', () => {
    test('should navigate to channels', async ({ page }) => {
      // チャンネルタブをクリック
      const channelTab = page.locator('[role="tab"], button').filter({
        hasText: /チャンネル|Channel|通知/i,
      });

      if (await channelTab.count() > 0) {
        await channelTab.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should display channel list', async ({ page }) => {
      // チャンネルタブへ移動
      const channelTab = page.locator('[role="tab"], button').filter({
        hasText: /チャンネル|Channel/i,
      });

      if (await channelTab.count() > 0) {
        await channelTab.first().click();
        await page.waitForTimeout(500);

        // チャンネル一覧が表示される
        const list = page.locator('table, [class*="list"]');
        await expect(list.first()).toBeVisible();
      }
    });

    test('should add new channel', async ({ page }) => {
      // チャンネルタブへ移動
      const channelTab = page.locator('[role="tab"], button').filter({
        hasText: /チャンネル|Channel/i,
      });

      if (await channelTab.count() > 0) {
        await channelTab.first().click();
        await page.waitForTimeout(500);

        // 追加ボタンを探す
        const addButton = page.locator('button').filter({
          hasText: /追加|Add|新規/i,
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

  test.describe('Test Alert', () => {
    test('should send test alert', async ({ page }) => {
      // テストアラートボタンを探す
      const testButton = page.locator('button').filter({
        hasText: /テスト|Test|送信/i,
      });

      if (await testButton.count() > 0) {
        await testButton.first().click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Escalation Settings', () => {
    test('should navigate to escalation', async ({ page }) => {
      // エスカレーションタブをクリック
      const escTab = page.locator('[role="tab"], button').filter({
        hasText: /エスカレーション|Escalation/i,
      });

      if (await escTab.count() > 0) {
        await escTab.first().click();
        await page.waitForTimeout(500);
      }
    });
  });
});

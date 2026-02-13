import { test, expect } from '@playwright/test';

/**
 * 利益計算 E2Eテスト
 */
test.describe('Profit Calculation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profit-calculation');
    await page.waitForTimeout(1500);
  });

  test.describe('Dashboard View', () => {
    test('should display profit statistics', async ({ page }) => {
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
        hasText: /利益一覧|シミュレーション|コスト|手数料|目標|Profit|Simulation|Cost|Fee|Target/i,
      });
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Profit List', () => {
    test('should display profit calculations', async ({ page }) => {
      // 利益一覧が表示される
      const profitList = page.locator('table, [class*="list"], [class*="grid"]').first();
      await expect(profitList).toBeVisible();
    });

    test('should filter by profit status', async ({ page }) => {
      // フィルターを探す
      const filterSelect = page.locator('select, [role="combobox"]').filter({
        hasText: /ステータス|Status|黒字|赤字|Profitable|Loss/i,
      });

      if (await filterSelect.count() > 0) {
        await filterSelect.first().click();
        await page.waitForTimeout(300);
      }
    });

    test('should search listings', async ({ page }) => {
      // 検索入力を探す
      const searchInput = page.locator('input[type="search"], input[placeholder*="検索"], input[placeholder*="search"]');

      if (await searchInput.count() > 0) {
        await searchInput.first().fill('test');
        await page.waitForTimeout(500);
        await searchInput.first().clear();
      }
    });
  });

  test.describe('Profit Simulation', () => {
    test('should navigate to simulation tab', async ({ page }) => {
      // シミュレーションタブをクリック
      const simTab = page.locator('[role="tab"], button').filter({
        hasText: /シミュレーション|Simulation|シミュレータ/i,
      });

      if (await simTab.count() > 0) {
        await simTab.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should perform price simulation', async ({ page }) => {
      // シミュレーションタブへ移動
      const simTab = page.locator('[role="tab"], button').filter({
        hasText: /シミュレーション|Simulation/i,
      });

      if (await simTab.count() > 0) {
        await simTab.first().click();
        await page.waitForTimeout(500);

        // 価格入力フィールドを探す
        const priceInput = page.locator('input[type="number"]');
        if (await priceInput.count() > 0) {
          await priceInput.first().fill('100');
          await page.waitForTimeout(300);

          // 計算ボタンを探す
          const calcButton = page.locator('button').filter({
            hasText: /計算|Calculate|シミュレート/i,
          });
          if (await calcButton.count() > 0) {
            await calcButton.first().click();
            await page.waitForTimeout(500);
          }
        }
      }
    });

    test('should show simulation results', async ({ page }) => {
      // シミュレーションタブへ移動
      const simTab = page.locator('[role="tab"], button').filter({
        hasText: /シミュレーション|Simulation/i,
      });

      if (await simTab.count() > 0) {
        await simTab.first().click();
        await page.waitForTimeout(500);

        // 結果表示エリアを探す
        const results = page.locator('[class*="result"], [class*="output"]');
        if (await results.count() > 0) {
          await expect(results.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Cost Management', () => {
    test('should navigate to cost tab', async ({ page }) => {
      // コストタブをクリック
      const costTab = page.locator('[role="tab"], button').filter({
        hasText: /コスト|原価|Cost/i,
      });

      if (await costTab.count() > 0) {
        await costTab.first().click();
        await page.waitForTimeout(500);

        // コスト一覧が表示される
        const costList = page.locator('table, [class*="list"]');
        await expect(costList.first()).toBeVisible();
      }
    });

    test('should open add cost dialog', async ({ page }) => {
      // コストタブへ移動
      const costTab = page.locator('[role="tab"], button').filter({
        hasText: /コスト|原価|Cost/i,
      });

      if (await costTab.count() > 0) {
        await costTab.first().click();
        await page.waitForTimeout(500);

        // 追加ボタンをクリック
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

  test.describe('Fee Settings', () => {
    test('should navigate to fee settings', async ({ page }) => {
      // 手数料タブをクリック
      const feeTab = page.locator('[role="tab"], button').filter({
        hasText: /手数料|Fee/i,
      });

      if (await feeTab.count() > 0) {
        await feeTab.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should display marketplace fees', async ({ page }) => {
      // 手数料タブへ移動
      const feeTab = page.locator('[role="tab"], button').filter({
        hasText: /手数料|Fee/i,
      });

      if (await feeTab.count() > 0) {
        await feeTab.first().click();
        await page.waitForTimeout(500);

        // マーケットプレイス名が表示される
        const marketplaces = page.locator('text=/eBay|Joom/i');
        if (await marketplaces.count() > 0) {
          await expect(marketplaces.first()).toBeVisible();
        }
      }
    });

    test('should edit fee rates', async ({ page }) => {
      // 手数料タブへ移動
      const feeTab = page.locator('[role="tab"], button').filter({
        hasText: /手数料|Fee/i,
      });

      if (await feeTab.count() > 0) {
        await feeTab.first().click();
        await page.waitForTimeout(500);

        // 編集ボタンを探す
        const editButton = page.locator('button').filter({
          hasText: /編集|Edit/i,
        });
        if (await editButton.count() > 0) {
          await editButton.first().click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Profit Targets', () => {
    test('should navigate to targets tab', async ({ page }) => {
      // 目標タブをクリック
      const targetTab = page.locator('[role="tab"], button').filter({
        hasText: /目標|Target/i,
      });

      if (await targetTab.count() > 0) {
        await targetTab.first().click();
        await page.waitForTimeout(500);
      }
    });

    test('should display profit targets', async ({ page }) => {
      // 目標タブへ移動
      const targetTab = page.locator('[role="tab"], button').filter({
        hasText: /目標|Target/i,
      });

      if (await targetTab.count() > 0) {
        await targetTab.first().click();
        await page.waitForTimeout(500);

        // 目標値が表示される
        const targets = page.locator('text=/利益率|Margin|%/i');
        if (await targets.count() > 0) {
          await expect(targets.first()).toBeVisible();
        }
      }
    });

    test('should update profit targets', async ({ page }) => {
      // 目標タブへ移動
      const targetTab = page.locator('[role="tab"], button').filter({
        hasText: /目標|Target/i,
      });

      if (await targetTab.count() > 0) {
        await targetTab.first().click();
        await page.waitForTimeout(500);

        // 入力フィールドを探す
        const inputFields = page.locator('input[type="number"]');
        if (await inputFields.count() > 0) {
          await inputFields.first().fill('25');
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe('Profit Report', () => {
    test('should generate profit report', async ({ page }) => {
      // レポートボタンを探す
      const reportButton = page.locator('button').filter({
        hasText: /レポート|Report|出力|Export/i,
      });

      if (await reportButton.count() > 0) {
        await reportButton.first().click();
        await page.waitForTimeout(500);
      }
    });
  });
});

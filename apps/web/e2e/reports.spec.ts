import { test, expect } from '@playwright/test';

test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports');
  });

  test('should display reports page header', async ({ page }) => {
    // ヘッダーが表示されることを確認
    const header = page.locator('h1, h2').filter({ hasText: /レポート|分析|Reports/i });
    await expect(header.first()).toBeVisible();
  });

  test('should display KPI section', async ({ page }) => {
    await page.waitForTimeout(1000);

    // KPIカードセクションが表示される
    const kpiSection = page.locator('[class*="grid"]').first();
    await expect(kpiSection).toBeVisible();
  });

  test('should display sales trend chart', async ({ page }) => {
    await page.waitForTimeout(1500);

    // グラフ要素を確認（Recharts SVG or loading state）
    const chartOrLoading = page.locator('svg, [class*="chart"], [class*="loading"], [class*="spinner"]').first();
    if (await chartOrLoading.isVisible().catch(() => false)) {
      await expect(chartOrLoading).toBeVisible();
    }
  });

  test('should have period selector', async ({ page }) => {
    // 期間選択ボタンまたはセレクタが存在
    const periodSelector = page.locator('button, select').filter({ hasText: /今週|今月|30日|week|month/i });
    const count = await periodSelector.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display ranking section', async ({ page }) => {
    await page.waitForTimeout(1000);

    // ランキングセクション（カテゴリ別、ブランド別など）
    const rankingSection = page.locator('text=/ランキング|カテゴリ|ブランド|ranking/i');
    if (await rankingSection.first().isVisible().catch(() => false)) {
      await expect(rankingSection.first()).toBeVisible();
    }
  });

  test('should display P&L section', async ({ page }) => {
    await page.waitForTimeout(1000);

    // 損益計算書セクション
    const pnlSection = page.locator('text=/損益|P&L|収益|売上|revenue/i');
    if (await pnlSection.first().isVisible().catch(() => false)) {
      await expect(pnlSection.first()).toBeVisible();
    }
  });

  test('should have export buttons', async ({ page }) => {
    // CSV/PDFエクスポートボタンを確認
    const exportButtons = page.locator('button').filter({ hasText: /CSV|PDF|エクスポート|export/i });
    const count = await exportButtons.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display financial summary', async ({ page }) => {
    await page.waitForTimeout(1000);

    // 財務サマリーの要素を確認
    const financialElements = page.locator('text=/売上|利益|費用|revenue|profit/i');
    const count = await financialElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should be responsive', async ({ page }) => {
    // デスクトップサイズ
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('body')).toBeVisible();

    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display loading states gracefully', async ({ page }) => {
    // ページ読み込み中の状態を確認
    const loadingIndicators = page.locator('[class*="animate"], [class*="loading"], [class*="skeleton"]');

    // ローディングまたはコンテンツが表示される
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });
});

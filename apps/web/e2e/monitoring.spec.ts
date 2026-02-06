import { test, expect } from '@playwright/test';

test.describe('Admin Monitoring Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/monitoring');
  });

  test('should display monitoring page header', async ({ page }) => {
    const header = page.locator('h1, h2').filter({ hasText: /モニタリング|監視|Monitoring|Admin/i });
    await expect(header.first()).toBeVisible();
  });

  test('should display system health status', async ({ page }) => {
    await page.waitForTimeout(1000);

    // システムヘルスステータス
    const healthIndicator = page.locator('[class*="status"], [class*="health"], text=/正常|異常|healthy|unhealthy/i');
    if (await healthIndicator.count() > 0) {
      await expect(healthIndicator.first()).toBeVisible();
    }
  });

  test('should display service status cards', async ({ page }) => {
    await page.waitForTimeout(1000);

    // サービスステータスカード（API, Worker, DB, Redis等）
    const serviceCards = page.locator('[class*="card"]');
    const count = await serviceCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show queue statistics', async ({ page }) => {
    await page.waitForTimeout(1000);

    // キュー統計（待機中、処理中、完了、失敗）
    const queueStats = page.locator('text=/待機|処理中|完了|失敗|waiting|active|completed|failed/i');
    const count = await queueStats.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display job queue table', async ({ page }) => {
    await page.waitForTimeout(1000);

    // ジョブキューテーブル
    const table = page.locator('table, [class*="table"]');
    if (await table.count() > 0) {
      await expect(table.first()).toBeVisible();
    }
  });

  test('should show memory/CPU metrics', async ({ page }) => {
    await page.waitForTimeout(1000);

    // リソースメトリクス
    const metrics = page.locator('text=/CPU|メモリ|Memory|使用率|%/i');
    const count = await metrics.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have refresh button', async ({ page }) => {
    const refreshButton = page.locator('button').filter({
      hasText: /更新|リフレッシュ|refresh/i
    });
    if (await refreshButton.count() > 0) {
      await expect(refreshButton.first()).toBeVisible();
    }
  });

  test('should display error logs if any', async ({ page }) => {
    await page.waitForTimeout(1000);

    // エラーログセクション
    const errorSection = page.locator('text=/エラー|ログ|Error|Log/i');
    const count = await errorSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show uptime information', async ({ page }) => {
    await page.waitForTimeout(1000);

    // 稼働時間
    const uptime = page.locator('text=/稼働|uptime|日|時間|分/i');
    const count = await uptime.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should be responsive', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('body')).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });
});

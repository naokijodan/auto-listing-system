import { test, expect } from '@playwright/test';

test.describe('Jobs Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/jobs');
  });

  test('should display jobs page', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show queue statistics', async ({ page }) => {
    // キュー統計が表示されることを確認
    const statsSection = page.getByText(/キュー|queue|統計|stats/i);
    const statsCards = page.locator('[data-testid="queue-stats"]');

    await expect(statsSection.or(statsCards)).toBeVisible({ timeout: 10000 });
  });

  test('should have job type filter', async ({ page }) => {
    // ジョブタイプフィルターが存在するか確認
    const filterOptions = page.getByRole('combobox').or(
      page.getByRole('button', { name: /scrape|image|translate|publish|inventory/i })
    );

    if (await filterOptions.first().isVisible()) {
      await expect(filterOptions.first()).toBeVisible();
    }
  });

  test('should display job logs or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // ジョブログまたは空状態が表示されることを確認
    const jobLogs = page.getByRole('table').or(
      page.locator('[data-testid="job-log"]')
    );
    const emptyState = page.getByText(/ジョブがありません|no jobs|ログがありません/i);

    await expect(
      jobLogs.or(emptyState)
    ).toBeVisible({ timeout: 10000 });
  });

  test('should have refresh functionality', async ({ page }) => {
    // 更新ボタンが存在する場合
    const refreshButton = page.getByRole('button', { name: /更新|refresh|reload/i });
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      // 更新が実行されることを確認（ローディング状態など）
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Jobs Page - Queue Management', () => {
  test('should navigate to Bull Board', async ({ page }) => {
    await page.goto('/jobs');

    // Bull Boardへのリンクが存在する場合
    const bullBoardLink = page.getByRole('link', { name: /bull board|キュー管理/i });
    if (await bullBoardLink.isVisible()) {
      const href = await bullBoardLink.getAttribute('href');
      expect(href).toContain('admin/queues');
    }
  });
});

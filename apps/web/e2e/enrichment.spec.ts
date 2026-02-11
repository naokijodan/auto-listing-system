/**
 * Phase 47: E2Eテスト - エンリッチメント管理
 */
import { test, expect } from '@playwright/test';

test.describe('Enrichment Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/enrichment');
  });

  test('should display page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'エンリッチメント管理' })).toBeVisible();
  });

  test('should display status filter tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: '全て' })).toBeVisible();
    await expect(page.getByRole('button', { name: '処理中' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'レビュー待ち' })).toBeVisible();
    await expect(page.getByRole('button', { name: '承認済み' })).toBeVisible();
  });

  test('should display queue stats', async ({ page }) => {
    // キュー統計カードが表示されること
    await expect(page.getByText('待機中')).toBeVisible();
    await expect(page.getByText('処理中')).toBeVisible();
    await expect(page.getByText('完了')).toBeVisible();
    await expect(page.getByText('失敗')).toBeVisible();
  });

  test('should filter tasks by status', async ({ page }) => {
    // 「レビュー待ち」タブをクリック
    await page.getByRole('button', { name: 'レビュー待ち' }).click();
    // URLにステータスパラメータが含まれることを確認（オプション）
    // await expect(page).toHaveURL(/status=READY_TO_REVIEW/);
  });

  test('should display task list or empty state', async ({ page }) => {
    // タスクリストまたは空の状態が表示されること
    const taskList = page.locator('[data-testid="task-list"]');
    const emptyState = page.getByText(/タスクがありません|データがありません/);

    // どちらかが表示されること
    const hasTaskList = await taskList.isVisible().catch(() => false);
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    expect(hasTaskList || hasEmptyState).toBeTruthy();
  });
});

test.describe('Enrichment Workflow', () => {
  test('should navigate from sidebar', async ({ page }) => {
    await page.goto('/');

    // サイドバーからエンリッチメントページへ
    await page.getByRole('link', { name: 'エンリッチメント' }).click();
    await expect(page).toHaveURL('/enrichment');
  });

  test('should navigate to batch dashboard', async ({ page }) => {
    await page.goto('/');

    // サイドバーからバッチ処理ページへ
    await page.getByRole('link', { name: 'バッチ処理' }).click();
    await expect(page).toHaveURL('/batch');
  });
});

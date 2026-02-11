/**
 * Phase 47: E2Eテスト - バッチダッシュボード
 */
import { test, expect } from '@playwright/test';

test.describe('Batch Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/batch');
  });

  test('should display page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'バッチ処理ダッシュボード' })).toBeVisible();
  });

  test('should display queue stats cards', async ({ page }) => {
    // Enrichment Queueカード
    await expect(page.getByText('Enrichment Queue')).toBeVisible();

    // Joom Publish Queueカード
    await expect(page.getByText('Joom Publish Queue')).toBeVisible();
  });

  test('should display recovery stats section', async ({ page }) => {
    await expect(page.getByText('リカバリー統計')).toBeVisible();
    await expect(page.getByText('リトライ待ち')).toBeVisible();
    await expect(page.getByText('リトライ済み')).toBeVisible();
  });

  test('should display failed jobs section', async ({ page }) => {
    await expect(page.getByText('失敗ジョブ一覧')).toBeVisible();
  });

  test('should toggle between realtime and polling mode', async ({ page }) => {
    // 初期状態はリアルタイムモード
    const realtimeButton = page.getByRole('button', { name: /リアルタイム|接続中/ });
    await expect(realtimeButton).toBeVisible();

    // クリックしてポーリングモードに切り替え
    await realtimeButton.click();
    await expect(page.getByRole('button', { name: /ポーリング/ })).toBeVisible();

    // 再度クリックしてリアルタイムモードに戻す
    await page.getByRole('button', { name: /ポーリング/ }).click();
    await expect(page.getByRole('button', { name: /リアルタイム|接続中/ })).toBeVisible();
  });

  test('should have queue filter buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: '全て' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enrichment' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Joom' })).toBeVisible();
  });

  test('should have refresh button', async ({ page }) => {
    const refreshButton = page.getByRole('button', { name: '更新' });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    // ボタンがまだクリック可能であることを確認
    await expect(refreshButton).toBeEnabled();
  });

  test('should have retry batch button', async ({ page }) => {
    const retryButton = page.getByRole('button', { name: '失敗ジョブを再試行' });
    await expect(retryButton).toBeVisible();
  });
});

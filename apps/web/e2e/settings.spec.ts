import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page with tabs', async ({ page }) => {
    // ページタイトル確認
    await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();

    // タブが表示されることを確認
    await expect(page.getByRole('button', { name: '価格設定' })).toBeVisible();
    await expect(page.getByRole('button', { name: '出品設定' })).toBeVisible();
    await expect(page.getByRole('button', { name: '通知設定' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'マーケットプレイス' })).toBeVisible();
    await expect(page.getByRole('button', { name: '外観' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'システム' })).toBeVisible();
  });

  test('should switch to price settings tab', async ({ page }) => {
    await page.getByRole('button', { name: '価格設定' }).click();

    // eBay価格設定カードが表示されることを確認
    await expect(page.getByRole('heading', { name: 'eBay 価格設定' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Joom 価格設定' })).toBeVisible();

    // 入力フィールドが存在することを確認
    await expect(page.getByLabel('基本利益率 (%)')).toBeVisible();
  });

  test('should switch to listing settings tab', async ({ page }) => {
    await page.getByRole('button', { name: '出品設定' }).click();

    // リンクカードが表示されることを確認
    await expect(page.getByText('出品テンプレート')).toBeVisible();
    await expect(page.getByText('カテゴリマッピング')).toBeVisible();
    await expect(page.getByText('翻訳プロンプト')).toBeVisible();
  });

  test('should switch to notification settings tab', async ({ page }) => {
    await page.getByRole('button', { name: '通知設定' }).click();

    // 通知チャンネルカードが表示されることを確認
    await expect(page.getByRole('heading', { name: '通知チャンネル' })).toBeVisible();
    await expect(page.getByLabel('Slack Webhook URL')).toBeVisible();
  });

  test('should switch to marketplace settings tab', async ({ page }) => {
    await page.getByRole('button', { name: 'マーケットプレイス' }).click();

    // マーケットプレイス設定カードが表示されることを確認
    await expect(page.getByRole('heading', { name: 'eBay API 設定' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Joom API 設定' })).toBeVisible();
  });

  test('should switch to appearance settings tab', async ({ page }) => {
    await page.getByRole('button', { name: '外観' }).click();

    // 外観設定カードが表示されることを確認
    await expect(page.getByRole('heading', { name: '外観設定' })).toBeVisible();
    await expect(page.getByLabel('テーマ')).toBeVisible();
  });

  test('should switch to system settings tab', async ({ page }) => {
    await page.getByRole('button', { name: 'システム' }).click();

    // システム設定カードが表示されることを確認
    await expect(page.getByRole('heading', { name: 'スケジューラー設定' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'データベース' })).toBeVisible();
  });

  test('should navigate to templates page from listing settings', async ({ page }) => {
    await page.getByRole('button', { name: '出品設定' }).click();

    // テンプレートリンクをクリック
    await page.getByText('出品テンプレート').click();

    await expect(page).toHaveURL(/.*settings\/templates/);
  });

  test('should navigate to categories page from listing settings', async ({ page }) => {
    await page.getByRole('button', { name: '出品設定' }).click();

    // カテゴリマッピングリンクをクリック
    await page.getByText('カテゴリマッピング').click();

    await expect(page).toHaveURL(/.*settings\/categories/);
  });

  test('should navigate to prompts page from listing settings', async ({ page }) => {
    await page.getByRole('button', { name: '出品設定' }).click();

    // 翻訳プロンプトリンクをクリック
    await page.getByText('翻訳プロンプト').click();

    await expect(page).toHaveURL(/.*settings\/prompts/);
  });
});

test.describe('Settings Sub-pages', () => {
  test('should load templates page', async ({ page }) => {
    await page.goto('/settings/templates');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should load categories page', async ({ page }) => {
    await page.goto('/settings/categories');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should load prompts page', async ({ page }) => {
    await page.goto('/settings/prompts');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should load rate-limits page', async ({ page }) => {
    await page.goto('/settings/rate-limits');

    await expect(page.locator('body')).toBeVisible();
  });
});

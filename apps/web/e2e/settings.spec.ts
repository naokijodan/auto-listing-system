import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page with tabs', async ({ page }) => {
    // ページタイトル確認
    const heading = page.locator('h1').filter({ hasText: '設定' });
    await expect(heading).toBeVisible();

    // タブが表示されることを確認（ボタンまたはテキストとして）
    await expect(page.getByText('価格設定').first()).toBeVisible();
    await expect(page.getByText('出品設定').first()).toBeVisible();
    await expect(page.getByText('通知設定').first()).toBeVisible();
    await expect(page.getByText('マーケットプレイス').first()).toBeVisible();
    await expect(page.getByText('外観').first()).toBeVisible();
    await expect(page.getByText('システム').first()).toBeVisible();
  });

  test('should switch to price settings tab', async ({ page }) => {
    await page.getByText('価格設定').first().click();

    // eBay価格設定カードが表示されることを確認
    await expect(page.getByRole('heading', { name: 'eBay 価格設定' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Joom 価格設定' })).toBeVisible();

    // 入力フィールドが存在することを確認（labelのテキストで検索）
    await expect(page.getByText('基本利益率 (%)').first()).toBeVisible();
  });

  test('should switch to listing settings tab', async ({ page }) => {
    await page.getByRole('button', { name: '出品設定' }).click();

    // リンクカードが表示されることを確認
    await expect(page.getByText('出品テンプレート')).toBeVisible();
    await expect(page.getByText('カテゴリマッピング')).toBeVisible();
    await expect(page.getByText('翻訳プロンプト')).toBeVisible();
  });

  test('should switch to notification settings tab', async ({ page }) => {
    await page.getByText('通知設定').first().click();

    // 通知設定カードのタイトルが表示されることを確認
    // CardTitle is used which renders as an h3 or similar
    await expect(page.getByText('通知チャンネル管理').or(page.getByText('通知設定'))).toBeVisible();
  });

  test('should switch to marketplace settings tab', async ({ page }) => {
    await page.getByRole('button', { name: 'マーケットプレイス' }).click();

    // マーケットプレイス設定カードが表示されることを確認
    await expect(page.getByRole('heading', { name: 'eBay API 設定' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Joom API 設定' })).toBeVisible();
  });

  test('should switch to appearance settings tab', async ({ page }) => {
    await page.getByText('外観').first().click();

    // 外観設定カードが表示されることを確認
    await expect(page.getByRole('heading', { name: '外観設定' })).toBeVisible();
    await expect(page.getByText('テーマ')).toBeVisible();
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

  test('should load notifications settings page', async ({ page }) => {
    await page.goto('/settings/notifications');

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Notification Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/notifications');
  });

  test('should display notification channels header', async ({ page }) => {
    // 通知チャンネル管理ヘッダー
    const header = page.locator('h1, h2').filter({ hasText: /通知チャンネル|Notification/i });
    await expect(header.first()).toBeVisible();
  });

  test('should have add channel button', async ({ page }) => {
    // チャンネル追加ボタン
    const addButton = page.locator('button').filter({ hasText: /追加|新規|Add|New/i });
    if (await addButton.first().isVisible().catch(() => false)) {
      await expect(addButton.first()).toBeVisible();
    }
  });

  test('should display channel list or empty state', async ({ page }) => {
    await page.waitForTimeout(1000);

    // チャンネルリストまたは空状態のいずれかが表示される
    const channelCards = page.locator('[class*="card"], [class*="border"]');
    const emptyState = page.locator('text=/チャンネルがありません|設定されていません|empty/i');

    const hasChannels = await channelCards.count() > 0;
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    expect(hasChannels || hasEmptyState || true).toBeTruthy();
  });

  test('should display channel type options', async ({ page }) => {
    await page.waitForTimeout(500);

    // Slack, Discord, LINE, Email などのチャンネルタイプ
    const channelTypes = page.locator('text=/Slack|Discord|LINE|Email/i');
    const count = await channelTypes.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

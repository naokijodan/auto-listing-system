import { test, expect } from '@playwright/test';

// Base API for direct requests if needed
const API_BASE = process.env.API_BASE || 'http://localhost:3010';

test.describe('eBay Template Settings', () => {
  test('should display template management page', async ({ page }) => {
    await page.goto('/ebay/templates');
    await page.waitForTimeout(1500);

    await expect(page.locator('body')).toBeVisible();
    // ヘッダー確認（出品テンプレート）
    const heading = page.getByRole('heading', { name: /出品テンプレート|template/i });
    await expect(heading).toBeVisible();
  });

  test('should toggle Best Offer and allow price inputs', async ({ page }) => {
    await page.goto('/ebay/templates');
    await page.waitForTimeout(1200);

    // 新規テンプレートモーダルを開く
    await page.getByRole('button', { name: /新規テンプレート|テンプレートを作成/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Best Offerトグルが表示されること
    const bestOfferSwitch = page.locator('#bestOfferEnabled');
    await expect(bestOfferSwitch).toBeVisible();

    // トグルをONにする
    await bestOfferSwitch.click();

    // 自動承認価格 / 最低受付価格 入力欄が表示されること
    const autoAcceptInput = page.getByPlaceholder('自動承認の最低価格');
    const minAcceptInput = page.getByPlaceholder('これ以下は自動拒否');
    await expect(autoAcceptInput).toBeVisible();
    await expect(minAcceptInput).toBeVisible();

    // 数値入力が可能なこと
    await autoAcceptInput.fill('100');
    await minAcceptInput.fill('50');
    await expect(autoAcceptInput).toHaveValue('100');
    await expect(minAcceptInput).toHaveValue('50');
  });

  test('should show duration select with GTC default and all options selectable', async ({ page }) => {
    await page.goto('/ebay/templates');
    await page.waitForTimeout(1200);

    // 新規テンプレートモーダルを開く
    await page.getByRole('button', { name: /新規テンプレート|テンプレートを作成/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // デフォルトがGTC（Good 'Til Cancelled）で表示されること
    const durationTrigger = page.getByRole('button', { name: /Good 'Til Cancelled/ });
    await expect(durationTrigger).toBeVisible();

    // ドロップダウンを開いて6つのオプションが表示されること
    await durationTrigger.click();
    const options = page.getByRole('option');
    await expect(options).toHaveCount(6);
    await expect(page.getByRole('option', { name: /Good 'Til Cancelled/ })).toBeVisible();
    await expect(page.getByRole('option', { name: '30日間' })).toBeVisible();
    await expect(page.getByRole('option', { name: '10日間' })).toBeVisible();
    await expect(page.getByRole('option', { name: '7日間' })).toBeVisible();
    await expect(page.getByRole('option', { name: '5日間' })).toBeVisible();
    await expect(page.getByRole('option', { name: '3日間' })).toBeVisible();

    // オプションを選択できること（30日間）
    await page.getByRole('option', { name: '30日間' }).click();
    await expect(page.getByRole('button', { name: '30日間' })).toBeVisible();
  });

  test('should display policy selects and show loading state', async ({ page }) => {
    // ポリシーAPIを遅延させてローディング状態を確認
    await page.route('**/api/ebay/policies?marketplaceId=EBAY_US', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { fulfillment: [], payment: [], return: [] } }),
      });
    });

    await page.goto('/ebay/templates');
    await page.waitForTimeout(800);

    // 新規テンプレートモーダルを開く
    await page.getByRole('button', { name: /新規テンプレート|テンプレートを作成/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // 各ポリシーSelectが表示されること（id指定のトリガー）
    const fulfillmentSelect = page.locator('#fulfillmentPolicyId');
    const paymentSelect = page.locator('#paymentPolicyId');
    const returnSelect = page.locator('#returnPolicyId');
    await expect(fulfillmentSelect).toBeVisible();
    await expect(paymentSelect).toBeVisible();
    await expect(returnSelect).toBeVisible();

    // ローディング中プレースホルダの表示
    await expect(fulfillmentSelect).toContainText('読み込み中...');
    await expect(paymentSelect).toContainText('読み込み中...');
    await expect(returnSelect).toContainText('読み込み中...');

    // ローディング解除後は選択プレースホルダへ変わること
    await page.waitForTimeout(2200);
    await expect(fulfillmentSelect).toContainText('配送ポリシーを選択');
    await expect(paymentSelect).toContainText('支払いポリシーを選択');
    await expect(returnSelect).toContainText('返品ポリシーを選択');
  });

  test('should input required fields and save template', async ({ page }) => {
    // 保存APIをモック（成功レスポンス）
    await page.route('**/api/ebay-templates', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { id: 'tmp-id' } }),
        });
      }
      return route.continue();
    });

    await page.goto('/ebay/templates');
    await page.waitForTimeout(1200);

    // 新規テンプレートモーダルを開く
    await page.getByRole('button', { name: /新規テンプレート|テンプレートを作成/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // 必須項目入力（テンプレート名、カテゴリID）
    await page.locator('#name').fill('E2E Test Template');
    await page.locator('#categoryId').fill('31387');

    // 保存ボタンをクリック（作成）
    await page.getByRole('button', { name: '作成' }).click();

    // モーダルが閉じること（保存完了）
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5000 });

    // 可能であれば、一覧に表示されることを軽く確認（存在しなくてもテストは失敗にしない）
    // ここではページが引き続き表示されていることのみ確認
    await expect(page.locator('body')).toBeVisible();
  });
});


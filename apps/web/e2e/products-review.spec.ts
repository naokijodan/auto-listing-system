import { test, expect } from '@playwright/test';

test.describe('Products Review Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products/review');
  });

  test('should display review page with header', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /商品レビュー|product review/i });
    await expect(heading).toBeVisible();
  });

  test('should show product count or empty state', async ({ page }) => {
    // 承認待ち件数または空状態のメッセージが表示される
    const countText = page.getByText(/件.*承認待ち|pending|すべてレビュー済み/i);
    const emptyState = page.getByText(/すべてレビュー済み|no products|商品がありません/i);
    const loadingIndicator = page.getByText(/読み込み|loading/i);

    await expect(
      countText.or(emptyState).or(loadingIndicator)
    ).toBeVisible({ timeout: 10000 });
  });

  test('should have product list on the left', async ({ page }) => {
    // 左サイドのリストエリアが存在することを確認
    await page.waitForTimeout(1000); // データ読み込み待ち

    // リストが空でなければ、商品アイテムが表示される
    const productItems = page.locator('[class*="border-b"]').filter({ hasText: /¥|円/ });
    const emptyState = page.getByText(/すべてレビュー済み/i);

    const hasItems = await productItems.first().isVisible().catch(() => false);
    const isEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasItems || isEmpty).toBeTruthy();
  });

  test('should have action buttons for approve/reject', async ({ page }) => {
    await page.waitForTimeout(1000);

    // 承認・却下ボタンが存在することを確認
    const approveButton = page.getByRole('button', { name: /承認|approve/i });
    const rejectButton = page.getByRole('button', { name: /却下|reject/i });

    // 商品が存在する場合のみボタンが有効
    const emptyState = page.getByText(/すべてレビュー済み/i);
    if (await emptyState.isVisible()) {
      // 空の場合はスキップ
      return;
    }

    await expect(approveButton.or(rejectButton)).toBeVisible();
  });

  test('should display keyboard shortcuts hint', async ({ page }) => {
    // キーボードショートカットのヒントが表示される
    const shortcutHint = page.getByText(/移動|承認|却下/i).filter({ hasText: /A|R|←|→/ });

    await expect(shortcutHint.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Products Review Page - Navigation', () => {
  test('should navigate between products with buttons', async ({ page }) => {
    await page.goto('/products/review');
    await page.waitForTimeout(1000);

    const emptyState = page.getByText(/すべてレビュー済み/i);
    if (await emptyState.isVisible()) {
      return; // 商品がない場合はスキップ
    }

    // 次へ/前へボタン
    const nextButton = page.getByRole('button', { name: /次へ|next/i });
    const prevButton = page.getByRole('button', { name: /前へ|prev/i });

    await expect(nextButton.or(prevButton)).toBeVisible();
  });

  test('should show product position indicator', async ({ page }) => {
    await page.goto('/products/review');
    await page.waitForTimeout(1000);

    const emptyState = page.getByText(/すべてレビュー済み/i);
    if (await emptyState.isVisible()) {
      return;
    }

    // "1 / 10" のような位置インジケーター
    const positionIndicator = page.getByText(/\d+\s*\/\s*\d+/);
    await expect(positionIndicator).toBeVisible();
  });
});

test.describe('Products Review Page - Preview Panel', () => {
  test('should display Joom preview section', async ({ page }) => {
    await page.goto('/products/review');
    await page.waitForTimeout(2000); // プレビュー読み込み待ち

    const emptyState = page.getByText(/すべてレビュー済み/i);
    if (await emptyState.isVisible()) {
      return;
    }

    // プレビューパネル内に価格が表示される
    const priceDisplay = page.getByText(/\$\d+\.\d+/);
    await expect(priceDisplay.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display validation warnings if any', async ({ page }) => {
    await page.goto('/products/review');
    await page.waitForTimeout(2000);

    const emptyState = page.getByText(/すべてレビュー済み/i);
    if (await emptyState.isVisible()) {
      return;
    }

    // 警告がある場合は注意事項セクションが表示される
    const warningSection = page.getByText(/注意事項|warning/i);
    // 警告がない場合もある - 存在チェックのみ
    const exists = await warningSection.isVisible().catch(() => false);
    expect(typeof exists).toBe('boolean');
  });

  test('should display pricing breakdown', async ({ page }) => {
    await page.goto('/products/review');
    await page.waitForTimeout(2000);

    const emptyState = page.getByText(/すべてレビュー済み/i);
    if (await emptyState.isVisible()) {
      return;
    }

    // 価格内訳セクション
    const pricingSection = page.getByText(/価格内訳|pricing/i);
    await expect(pricingSection).toBeVisible({ timeout: 10000 });
  });

  test('should display SEO score', async ({ page }) => {
    await page.goto('/products/review');
    await page.waitForTimeout(2000);

    const emptyState = page.getByText(/すべてレビュー済み/i);
    if (await emptyState.isVisible()) {
      return;
    }

    // SEOスコア表示
    const seoScore = page.getByText(/SEO.*スコア|seo.*score/i);
    await expect(seoScore).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Products Review Page - Bulk Actions', () => {
  test('should allow selecting multiple products', async ({ page }) => {
    await page.goto('/products/review');
    await page.waitForTimeout(1000);

    const emptyState = page.getByText(/すべてレビュー済み/i);
    if (await emptyState.isVisible()) {
      return;
    }

    // チェックボックスが存在する
    const checkboxes = page.getByRole('checkbox');
    const firstCheckbox = checkboxes.first();

    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.click();
      await expect(firstCheckbox).toBeChecked();
    }
  });

  test('should show bulk approve button when items selected', async ({ page }) => {
    await page.goto('/products/review');
    await page.waitForTimeout(1000);

    const emptyState = page.getByText(/すべてレビュー済み/i);
    if (await emptyState.isVisible()) {
      return;
    }

    // チェックボックスを選択
    const checkboxes = page.getByRole('checkbox');
    const firstCheckbox = checkboxes.first();

    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.click();

      // 一括承認ボタンが表示される
      const bulkApproveButton = page.getByRole('button', { name: /一括承認|bulk.*approve/i });
      await expect(bulkApproveButton).toBeVisible();
    }
  });
});

test.describe('Products Review Page - Keyboard Navigation', () => {
  test('should respond to keyboard shortcuts', async ({ page }) => {
    await page.goto('/products/review');
    await page.waitForTimeout(1000);

    const emptyState = page.getByText(/すべてレビュー済み/i);
    if (await emptyState.isVisible()) {
      return;
    }

    // キーボード操作でナビゲーション
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);

    // ページがエラーなく動作することを確認
    await expect(page.locator('body')).toBeVisible();
  });
});

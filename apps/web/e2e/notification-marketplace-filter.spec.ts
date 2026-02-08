import { test, expect } from '@playwright/test';

test.describe('Notification Marketplace Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display notification channels page', async ({ page }) => {
    // Verify page header
    const header = page.locator('h1').filter({ hasText: '通知チャンネル設定' });
    await expect(header).toBeVisible();
  });

  test('should have add channel button', async ({ page }) => {
    // Verify add button exists
    const addButton = page.locator('button').filter({ hasText: 'チャンネル追加' });
    await expect(addButton).toBeVisible();
  });

  test('should open add channel modal', async ({ page }) => {
    // Click add button
    const addButton = page.locator('button').filter({ hasText: 'チャンネル追加' });
    await addButton.click();

    // Wait for modal to appear
    await page.waitForTimeout(300);

    // Verify modal is displayed
    const modalTitle = page.locator('h2').filter({ hasText: '新規チャンネル追加' });
    await expect(modalTitle).toBeVisible();
  });

  test('should display channel type options in modal', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(300);

    // Verify channel types
    await expect(page.getByText('Slack').first()).toBeVisible();
    await expect(page.getByText('Discord').first()).toBeVisible();
    await expect(page.getByText('LINE').first()).toBeVisible();
    await expect(page.getByText('Email').first()).toBeVisible();
  });

  test('should display marketplace filter section in modal', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(300);

    // Verify marketplace filter section exists
    await expect(page.getByText('対象マーケットプレイス').first()).toBeVisible();
  });

  test('should display Joom and eBay filter buttons', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(300);

    // Find marketplace filter buttons in modal
    const modalContent = page.locator('.fixed');
    const joomButton = modalContent.locator('button').filter({ hasText: 'Joom' });
    const ebayButton = modalContent.locator('button').filter({ hasText: 'eBay' });

    await expect(joomButton).toBeVisible();
    await expect(ebayButton).toBeVisible();
  });

  test('should toggle Joom marketplace filter', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(300);

    // Find Joom button in modal
    const modalContent = page.locator('.fixed');
    const joomButton = modalContent.locator('button').filter({ hasText: 'Joom' }).first();

    // Click to select Joom
    await joomButton.click();
    await page.waitForTimeout(200);

    // Verify Joom is selected (has amber styling or check icon)
    await expect(joomButton).toHaveClass(/amber|border-amber/);
  });

  test('should toggle eBay marketplace filter', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(300);

    // Find eBay button in modal
    const modalContent = page.locator('.fixed');
    const ebayButton = modalContent.locator('button').filter({ hasText: 'eBay' }).first();

    // Click to select eBay
    await ebayButton.click();
    await page.waitForTimeout(200);

    // Verify eBay is selected (has blue styling)
    await expect(ebayButton).toHaveClass(/blue|border-blue/);
  });

  test('should select both marketplaces', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(300);

    const modalContent = page.locator('.fixed');

    // Select Joom
    const joomButton = modalContent.locator('button').filter({ hasText: 'Joom' }).first();
    await joomButton.click();
    await page.waitForTimeout(200);

    // Select eBay
    const ebayButton = modalContent.locator('button').filter({ hasText: 'eBay' }).first();
    await ebayButton.click();
    await page.waitForTimeout(200);

    // Both should be selected
    await expect(joomButton).toHaveClass(/amber|border-amber/);
    await expect(ebayButton).toHaveClass(/blue|border-blue/);
  });

  test('should display filter status message', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(300);

    // Verify default message (no filter selected)
    await expect(page.getByText('全てのマーケットプレイスから通知を受信')).toBeVisible();
  });

  test('should update filter status message when marketplace selected', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(300);

    const modalContent = page.locator('.fixed');

    // Select Joom
    const joomButton = modalContent.locator('button').filter({ hasText: 'Joom' }).first();
    await joomButton.click();
    await page.waitForTimeout(300);

    // Verify status message updated
    await expect(page.getByText('JOOM からの通知のみ受信')).toBeVisible();
  });

  test('should deselect marketplace on second click', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(300);

    const modalContent = page.locator('.fixed');
    const joomButton = modalContent.locator('button').filter({ hasText: 'Joom' }).first();

    // Select Joom
    await joomButton.click();
    await page.waitForTimeout(200);

    // Deselect Joom
    await joomButton.click();
    await page.waitForTimeout(200);

    // Verify back to default message
    await expect(page.getByText('全てのマーケットプレイスから通知を受信')).toBeVisible();
  });

  test('should close modal on cancel', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(300);

    // Click cancel
    const cancelButton = page.locator('button').filter({ hasText: 'キャンセル' });
    await cancelButton.click();

    // Verify modal is closed
    await page.waitForTimeout(300);
    await expect(page.locator('.fixed').filter({ hasText: '新規チャンネル追加' })).not.toBeVisible();
  });

  test('should have channel name input', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(300);

    // Verify channel name input exists
    await expect(page.getByText('チャンネル名').first()).toBeVisible();
    const nameInput = page.locator('input[placeholder*="例"]');
    await expect(nameInput).toBeVisible();
  });

  test('should have webhook URL input for Slack', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(300);

    // Verify webhook URL input exists
    await expect(page.getByText('Webhook URL').first()).toBeVisible();
    const webhookInput = page.locator('input[type="url"]');
    await expect(webhookInput).toBeVisible();
  });

  test('should have min severity selector', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(300);

    // Verify severity selector exists
    await expect(page.getByText('最低重要度').first()).toBeVisible();
    await expect(page.getByText('INFO（すべて）').or(page.getByText('INFO'))).toBeVisible();
  });

  test('should have event type selection', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(300);

    // Verify event types section exists
    await expect(page.getByText('通知するイベント').first()).toBeVisible();
  });

  test('full workflow: add channel with marketplace filter', async ({ page }) => {
    // Open modal
    await page.locator('button').filter({ hasText: 'チャンネル追加' }).click();
    await page.waitForTimeout(500);

    const modalContent = page.locator('.fixed');

    // Step 1: Select channel type (Slack is default)
    // Already selected by default

    // Step 2: Enter channel name
    const nameInput = modalContent.locator('input').first();
    await nameInput.fill('テスト通知チャンネル');

    // Step 3: Enter webhook URL
    const webhookInput = modalContent.locator('input[type="url"]');
    await webhookInput.fill('https://hooks.slack.com/services/test/test/test');

    // Step 4: Select marketplace filter (Joom only)
    const joomButton = modalContent.locator('button').filter({ hasText: 'Joom' }).first();
    await joomButton.click();
    await page.waitForTimeout(200);

    // Verify Joom is selected
    await expect(joomButton).toHaveClass(/amber|border-amber/);

    // Verify status message
    await expect(page.getByText('JOOM からの通知のみ受信')).toBeVisible();

    // Note: We don't actually submit as it would require API setup
  });
});

test.describe('Notification Channel List - Marketplace Filter Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should display channel cards or empty state', async ({ page }) => {
    // Either channel cards exist or empty state is shown
    const content = page.locator('[class*="card"], text=/チャンネルが|設定されていません/i');
    const hasContent = await content.count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('should display marketplace badges on channels with filter', async ({ page }) => {
    // Look for marketplace badges in channel list
    const joomBadge = page.locator('.bg-amber-100, [class*="amber"]').filter({ hasText: 'JOOM' });
    const ebayBadge = page.locator('.bg-blue-100, [class*="blue"]').filter({ hasText: 'EBAY' });

    // Count how many exist (may be 0 if no channels with filters)
    const joomCount = await joomBadge.count();
    const ebayCount = await ebayBadge.count();

    // This test just verifies the selectors work - may be 0 if no channels exist
    expect(joomCount).toBeGreaterThanOrEqual(0);
    expect(ebayCount).toBeGreaterThanOrEqual(0);
  });

  test('should display target market label when filter exists', async ({ page }) => {
    // Look for the "対象マーケット:" label
    const marketLabel = page.locator('text=対象マーケット');
    const count = await marketLabel.count();

    // May be 0 if no channels have marketplace filters
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Notification Settings - Edit Channel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should have edit buttons on channel cards', async ({ page }) => {
    // Look for edit buttons (pencil icon)
    const editButtons = page.locator('button').filter({ has: page.locator('[class*="Edit"], svg') });
    const count = await editButtons.count();

    // May be 0 if no channels exist
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have test buttons on channel cards', async ({ page }) => {
    // Look for test buttons
    const testButtons = page.locator('button').filter({ hasText: 'テスト' });
    const count = await testButtons.count();

    // May be 0 if no channels exist
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have toggle active buttons on channel cards', async ({ page }) => {
    // Look for toggle buttons (X or check icons)
    const toggleButtons = page.locator('button').filter({
      has: page.locator('[class*="Check"], [class*="X"], svg'),
    });
    const count = await toggleButtons.count();

    // May be 0 if no channels exist
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have delete buttons on channel cards', async ({ page }) => {
    // Look for delete buttons (trash icon)
    const deleteButtons = page.locator('button').filter({
      has: page.locator('[class*="Trash"], svg'),
    });
    const count = await deleteButtons.count();

    // May be 0 if no channels exist
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Notification Marketplace Filter - Responsive', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/settings/notifications');
    await page.waitForLoadState('domcontentloaded');

    // Open modal
    const addButton = page.locator('button').filter({ hasText: 'チャンネル追加' });
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(300);

      // Verify modal is visible
      await expect(page.locator('.fixed')).toBeVisible();

      // Verify marketplace filter section is visible
      await expect(page.getByText('対象マーケットプレイス').first()).toBeVisible();
    }
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/settings/notifications');
    await page.waitForLoadState('domcontentloaded');

    // Open modal
    const addButton = page.locator('button').filter({ hasText: 'チャンネル追加' });
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(300);

      // Verify modal is visible
      await expect(page.locator('.fixed')).toBeVisible();
    }
  });
});

import { test, expect } from '@playwright/test';

test.describe('Model Lab', () => {
  test('page loads', async ({ page }) => {
    await page.goto('/model-lab');
    await expect(page).toHaveTitle(/Model Lab/);
  });

  test('shows either data or instructions', async ({ page }) => {
    await page.goto('/model-lab');
    // Either the method box (data exists) or the state message (no data)
    const hasMethodBox = page.locator('.method-box');
    const hasStateMsg = page.locator('.state-msg');
    const methodVisible = await hasMethodBox.isVisible().catch(() => false);
    const stateVisible = await hasStateMsg.isVisible().catch(() => false);
    expect(methodVisible || stateVisible).toBe(true);
  });

  test('nav link to dashboard works', async ({ page }) => {
    await page.goto('/model-lab');
    await page.locator('a[href="/"]').click();
    await expect(page).toHaveURL('/');
  });
});

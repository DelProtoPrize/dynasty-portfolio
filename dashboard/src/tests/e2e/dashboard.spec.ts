import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('page loads with title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Roster Portfolio & Asset Valuation');
  });

  test('league selector is populated', async ({ page }) => {
    await page.goto('/');
    const select = page.locator('select');
    await expect(select).toBeVisible();
    const options = await select.locator('option').count();
    expect(options).toBeGreaterThan(0);
  });

  test('diagnostics table has rows', async ({ page }) => {
    await page.goto('/');
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('KPI cards show real values', async ({ page }) => {
    await page.goto('/');
    // Portfolio Value should be a number, not a dash
    const kpiValue = page.locator('.kpi-value').first();
    await expect(kpiValue).toBeVisible();
    const text = await kpiValue.textContent();
    expect(text).not.toBe('–');
    expect(text).toMatch(/[\d,]+/);
  });

  test('clicking a team shows roster detail', async ({ page }) => {
    await page.goto('/');
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10000 });
    await firstRow.click();
    await expect(page.getByText('Roster Detail')).toBeVisible({ timeout: 5000 });
  });

  test('league selector changes URL', async ({ page }) => {
    await page.goto('/');
    const select = page.locator('select');
    await expect(select).toBeVisible();
    const options = await select.locator('option').all();
    if (options.length > 1) {
      await select.selectOption({ index: 1 });
      await expect(page).toHaveURL(/league=/);
    }
  });
});

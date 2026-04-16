import { test, expect } from '@playwright/test';
import { makeMockPriceData, mockApiResponse } from './fixtures';

const todayData = makeMockPriceData();

test.beforeEach(async ({ page }) => {
  await page.route('**/api/prices/today', (route) =>
    route.fulfill({ json: mockApiResponse(todayData) })
  );
  await page.route('**/api/prices/tomorrow', (route) => route.fulfill({ status: 404 }));
});

test('theme toggle is visible in header', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('radiogroup', { name: 'Seleccionar tema' });
  await expect(toggle).toBeVisible();
});

test('clicking dark mode adds .dark class to html', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Modo oscuro' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('clicking light mode removes .dark class', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Modo oscuro' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.getByRole('radio', { name: 'Modo claro' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

test('dark mode persists across page reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Modo oscuro' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('system mode respects prefers-color-scheme: dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  // System mode is default, so with dark scheme the page should be dark
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('system mode respects prefers-color-scheme: light', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

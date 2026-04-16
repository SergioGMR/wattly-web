import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { makeMockPriceData, mockApiResponse } from './fixtures';

const todayData = makeMockPriceData();

test.beforeEach(async ({ page }) => {
  await page.route('**/api/prices/today', (route) =>
    route.fulfill({ json: mockApiResponse(todayData) })
  );
  await page.route('**/api/prices/tomorrow', (route) => route.fulfill({ status: 404 }));
  await page.goto('/');
});

test('no axe-core violations on full page', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

  expect(results.violations).toHaveLength(0);
});

test('tabs are keyboard navigable', async ({ page }) => {
  const todayTab = page.getByRole('tab', { name: 'Hoy' });
  await todayTab.focus();
  await expect(todayTab).toBeFocused();
});

test('form inputs are accessible via keyboard', async ({ page }) => {
  await page.getByText('Mis electrodomésticos').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const nameInput = page.getByPlaceholder('Nombre (ej. Horno)');
  await nameInput.focus();
  await expect(nameInput).toBeFocused();
});

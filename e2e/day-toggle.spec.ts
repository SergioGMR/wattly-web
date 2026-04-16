import { test, expect } from '@playwright/test';
import { makeMockPriceData, mockApiResponse } from './fixtures';

const todayData = makeMockPriceData();
const tomorrowData = makeMockPriceData({ date: '2026-04-17' });

test.describe('Day toggle — tomorrow available', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/prices/today', (route) =>
      route.fulfill({ json: mockApiResponse(todayData) })
    );
    await page.route('**/api/prices/tomorrow', (route) =>
      route.fulfill({ json: mockApiResponse(tomorrowData) })
    );
    await page.goto('/');
  });

  test('shows both tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Hoy' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Mañana' })).toBeVisible();
  });

  test('can switch to tomorrow tab', async ({ page }) => {
    await page.getByRole('tab', { name: 'Mañana' }).click();
    await expect(page.getByRole('tab', { name: 'Mañana' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});

test.describe('Day toggle — tomorrow not available (404)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/prices/today', (route) =>
      route.fulfill({ json: mockApiResponse(todayData) })
    );
    await page.route('**/api/prices/tomorrow', (route) => route.fulfill({ status: 404 }));
    await page.goto('/');
  });

  test('tomorrow tab is disabled', async ({ page }) => {
    const tomorrowTab = page.getByRole('tab', { name: /Mañana/ });
    await expect(tomorrowTab).toBeDisabled();
  });

  test('shows "disponible" in the tab text', async ({ page }) => {
    await expect(page.getByText(/~20:00/)).toBeVisible();
  });
});

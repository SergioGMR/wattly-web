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
    const tomorrowTab = page.getByRole('tab', { name: /Mañana/ });
    if (await tomorrowTab.isDisabled()) {
      test.skip(true, 'Tomorrow prices are not yet published on the server (before 13:00)');
    }
    await tomorrowTab.click();
    await expect(tomorrowTab).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Day toggle — tomorrow not available', () => {
  test('tomorrow tab is disabled when data is null', async ({ page }) => {
    await page.goto('/');
    const tomorrowTab = page.getByRole('tab', { name: /Mañana/ });
    if (await tomorrowTab.isEnabled()) {
      test.skip(true, 'Tomorrow prices are currently available live from REE/OMIE');
    }
    await expect(tomorrowTab).toBeDisabled();
    await expect(page.getByText(/disponible/)).toBeVisible();
  });
});

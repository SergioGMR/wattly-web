import { test, expect } from '@playwright/test';
import { makeMockPriceData, mockApiResponse } from './fixtures';

const todayData = makeMockPriceData();

test.beforeEach(async ({ page }) => {
  await page.route('**/api/prices/today', (route) =>
    route.fulfill({ json: mockApiResponse(todayData) })
  );
  await page.route('**/api/prices/tomorrow', (route) => route.fulfill({ status: 404 }));
});

test('page loads correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Wattly/);
  await expect(page.locator('header')).toBeVisible();
  await expect(page.locator('main')).toBeVisible();
});

test('price hero is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Precio ahora/)).toBeVisible();
});

test('chart is visible with correct role', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
});

test('highlights show min, max and average', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Mínimo del día')).toBeVisible();
  await expect(page.getByText('Máximo del día')).toBeVisible();
  await expect(page.getByText('Promedio del día')).toBeVisible();
});

test('appliance tips are rendered server-side', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Lavadora')).toBeVisible();
  await expect(page.getByText('Secadora')).toBeVisible();
  await expect(page.getByText('Lavavajillas')).toBeVisible();
});

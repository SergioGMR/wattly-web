import { test, expect } from '@playwright/test';
import { makeMockPriceData, mockApiResponse } from './fixtures';

const todayData = makeMockPriceData();

test.beforeEach(async ({ page }) => {
  await page.route('**/api/prices/today', (route) =>
    route.fulfill({ json: mockApiResponse(todayData) })
  );
  await page.route('**/api/prices/tomorrow', (route) => route.fulfill({ status: 404 }));
  await page.goto('/');
  // Scroll to configurator so client:visible hydrates it
  await page.getByText('Mis electrodomésticos').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
});

test('can add a custom appliance', async ({ page }) => {
  await page.getByPlaceholder('Nombre (ej. Horno)').fill('Horno');
  await page.getByPlaceholder('Horas').fill('1');
  await page.getByRole('button', { name: 'Añadir' }).click();
  await expect(page.getByText('Horno')).toBeVisible();
});

test('persists appliances across reload', async ({ page }) => {
  await page.getByPlaceholder('Nombre (ej. Horno)').fill('Calefactor');
  await page.getByPlaceholder('Horas').fill('4');
  await page.getByRole('button', { name: 'Añadir' }).click();
  await expect(page.getByText('Calefactor')).toBeVisible();

  await page.reload();
  await page.getByText('Mis electrodomésticos').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await expect(page.getByText('Calefactor')).toBeVisible();
});

test('can remove a custom appliance', async ({ page }) => {
  await page.getByPlaceholder('Nombre (ej. Horno)').fill('Aspiradora');
  await page.getByPlaceholder('Horas').fill('1');
  await page.getByRole('button', { name: 'Añadir' }).click();
  await expect(page.getByText('Aspiradora')).toBeVisible();

  await page.getByRole('button', { name: 'Eliminar Aspiradora' }).click();
  await expect(page.getByText('Aspiradora')).not.toBeVisible();
});

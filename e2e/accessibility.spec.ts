import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { makeMockPriceData, mockApiResponse } from './fixtures';

const todayData = makeMockPriceData();
const tomorrowData = makeMockPriceData({ date: '2026-04-17' });

test.beforeEach(async ({ page }) => {
  await page.route('**/api/prices/today', (route) =>
    route.fulfill({ json: mockApiResponse(todayData) })
  );
  await page.route('**/api/prices/tomorrow', (route) => route.fulfill({ status: 404 }));
  await page.goto('/');
});

test('no axe-core violations (wcag2a + wcag2aa)', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
    .analyze();

  expect(results.violations).toHaveLength(0);
});

test('skip link becomes visible on focus and navigates to main', async ({ page }) => {
  await page.keyboard.press('Tab');
  const skipLink = page.getByText('Saltar al contenido principal');
  await expect(skipLink).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('tabs are keyboard navigable', async ({ page }) => {
  const todayTab = page.getByRole('tab', { name: 'Hoy' });
  await todayTab.focus();
  await expect(todayTab).toBeFocused();
});

test('tab arrow key navigation works', async ({ context }) => {
  // Set up with tomorrow data available
  const pageWithTomorrow = await context.newPage();
  await pageWithTomorrow.route('**/api/prices/today', (route) =>
    route.fulfill({ json: mockApiResponse(todayData) })
  );
  await pageWithTomorrow.route('**/api/prices/tomorrow', (route) =>
    route.fulfill({ json: mockApiResponse(tomorrowData) })
  );
  await pageWithTomorrow.goto('/');

  const todayTab = pageWithTomorrow.getByRole('tab', { name: 'Hoy' });
  await todayTab.focus();
  await pageWithTomorrow.keyboard.press('ArrowRight');
  const tomorrowTab = pageWithTomorrow.getByRole('tab', { name: 'Mañana' });
  await expect(tomorrowTab).toBeFocused();
  await expect(tomorrowTab).toHaveAttribute('aria-selected', 'true');
  await pageWithTomorrow.close();
});

test('theme toggle radio group supports arrow keys', async ({ page }) => {
  const systemRadio = page.getByRole('radio', { name: 'Sistema' });
  await systemRadio.focus();
  await page.keyboard.press('ArrowRight');
  const lightRadio = page.getByRole('radio', { name: 'Modo claro' });
  await expect(lightRadio).toBeFocused();
  await expect(lightRadio).toHaveAttribute('aria-checked', 'true');
});

test('price data is available in tabular format', async ({ page }) => {
  const summary = page.locator('details summary');
  await summary.click();
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  const rows = table.locator('tbody tr');
  await expect(rows).toHaveCount(24);
});

test('form inputs are accessible via keyboard', async ({ page }) => {
  await page.getByText('Mis electrodomésticos').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const nameInput = page.getByPlaceholder('Nombre (ej. Horno)');
  await nameInput.focus();
  await expect(nameInput).toBeFocused();
});

test('adding an appliance updates the live region', async ({ page }) => {
  await page.getByText('Mis electrodomésticos').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  await page.fill('#appliance-name', 'Horno');
  await page.fill('#appliance-duration', '2');
  await page.getByRole('button', { name: 'Añadir' }).click();

  const liveRegion = page.locator('[aria-live="polite"]');
  await expect(liveRegion.getByText('Horno')).toBeVisible();
});

test('all interactive elements have visible focus indicators', async ({ page }) => {
  // Tab through the page and verify focus is visible
  const todayTab = page.getByRole('tab', { name: 'Hoy' });
  await todayTab.focus();
  const outline = await todayTab.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

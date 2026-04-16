import { test, expect } from '@playwright/test';
import { makeMockPriceData, mockApiResponse } from './fixtures';

const todayData = makeMockPriceData();

test.beforeEach(async ({ page }) => {
  await page.route('**/api/prices/today', (route) =>
    route.fulfill({ json: mockApiResponse(todayData) })
  );
  await page.route('**/api/prices/tomorrow', (route) => route.fulfill({ status: 404 }));
});

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
];

for (const { name, width, height } of viewports) {
  test(`layout correct on ${name} (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(width);

    // Key elements visible
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText(/Precio ahora/)).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
  });
}

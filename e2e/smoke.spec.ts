import { test, expect } from '@playwright/test';

test('localhost に接続できる', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
});

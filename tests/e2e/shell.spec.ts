import { expect, test } from '@playwright/test';

test('empty library shell loads and has an install manifest', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'QUEST JOURNAL' })).toBeVisible();
  await expect(page.getByText('No stories yet.')).toBeVisible();

  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const res = await page.request.get(new URL(href!, page.url()).toString());
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.name).toBe('Quest Journal');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
});

test('opens offline after the first load', async ({ page, context }) => {
  await page.goto('./');
  // Wait until the service worker controls the page and has finished precaching.
  const ready = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    for (let i = 0; i < 100 && !navigator.serviceWorker.controller; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return !!navigator.serviceWorker.controller;
  });
  test.skip(!ready, 'this browser build does not run service workers under automation');

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'QUEST JOURNAL' })).toBeVisible();
  await expect(page.getByText('No stories yet.')).toBeVisible();
  await context.setOffline(false);
});

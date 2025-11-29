import { test } from '@playwright/test';

test('simple URL param test', async ({ page }) => {
  await page.goto('/?test=adaptive');

  const result = await page.evaluate(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      search: window.location.search,
      testParam: params.get('test'),
      isAdaptive: params.get('test') === 'adaptive',
      href: window.location.href
    };
  });

  console.log('URL Info:', JSON.stringify(result, null, 2));
});

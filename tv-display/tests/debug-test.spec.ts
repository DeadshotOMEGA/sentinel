import { test } from '@playwright/test';

test('debug test mode', async ({ page }) => {
  // Capture console logs
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message));

  await page.goto('/?test=adaptive');

  // Wait a bit for React to render
  await page.waitForTimeout(5000);

  // Get the full page content
  const content = await page.content();
  console.log('Page contains "Mode Test":', content.includes('Mode Test'));
  console.log('Page contains "slider":', content.includes('slider'));
  console.log('Page contains "AdaptiveMode":', content.includes('AdaptiveMode'));

  // Take screenshot
  await page.screenshot({ path: '/home/sauk/projects/sentinel/tv-display/test-screenshots/debug.png', fullPage: true });

  // Check URL
  console.log('Current URL:', page.url());
});

import { test } from '@playwright/test';

test('detailed debug', async ({ page, context }) => {
  // Disable cache
  await context.route('**/*', route => route.continue({ headers: { ...route.request().headers(), 'Cache-Control': 'no-cache' } }));

  const logs: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('[CONSOLE]', text);
  });

  page.on('pageerror', err => {
    errors.push(err.message);
    console.log('[ERROR]', err.message);
  });

  console.log('Navigating to /?test=adaptive...');
  await page.goto(`/?test=adaptive&_=${Date.now()}`, { waitUntil: 'networkidle' });

  console.log('Waiting 3 seconds for React to render...');
  await page.waitForTimeout(3000);

  console.log('\n=== ALL CONSOLE LOGS ===');
  logs.forEach(log => console.log(log));

  console.log('\n=== ALL ERRORS ===');
  errors.forEach(err => console.log(err));

  console.log('\n=== PAGE STATE ===');
  const url = page.url();
  const title = await page.title();
  console.log('URL:', url);
  console.log('Title:', title);

  // Check what's actually rendered
  const bodyText = await page.locator('body').textContent();
  console.log('\n=== BODY TEXT (first 500 chars) ===');
  console.log(bodyText?.substring(0, 500));

  // Check for specific elements
  console.log('\n=== ELEMENT CHECKS ===');
  console.log('Has input[type=range]:', await page.locator('input[type="range"]').count());
  console.log('Has "Mode Test Controls":', await page.locator('text=Mode Test Controls').count());
  console.log('Has "Currently In Building":', await page.locator('text=Currently In Building').count());
  console.log('Has "SENTINEL":', await page.locator('text=SENTINEL').count());

  await page.screenshot({ path: '/home/sauk/projects/sentinel/tv-display/test-screenshots/debug-detailed.png', fullPage: true });
});

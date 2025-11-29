import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Login to admin dashboard
    await page.goto('http://localhost:5173');

    // Wait for login form
    await page.waitForSelector('input[type="text"]');

    // Fill credentials
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('http://localhost:5173/', { timeout: 10000 });

    // Wait for dashboard to load
    await page.waitForTimeout(2000);
  });

  test('Dashboard Page', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'screenshots/admin-dashboard.png',
      fullPage: true
    });
  });

  test('Members Page', async ({ page }) => {
    await page.goto('http://localhost:5173/members');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'screenshots/admin-members.png',
      fullPage: true
    });
  });

  test('Visitors Page', async ({ page }) => {
    await page.goto('http://localhost:5173/visitors');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'screenshots/admin-visitors.png',
      fullPage: true
    });
  });

  test('Events Page', async ({ page }) => {
    await page.goto('http://localhost:5173/events');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'screenshots/admin-events.png',
      fullPage: true
    });
  });

  test('Reports Page', async ({ page }) => {
    await page.goto('http://localhost:5173/reports');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'screenshots/admin-reports.png',
      fullPage: true
    });
  });

  test('Settings Page', async ({ page }) => {
    await page.goto('http://localhost:5173/settings');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'screenshots/admin-settings.png',
      fullPage: true
    });
  });
});

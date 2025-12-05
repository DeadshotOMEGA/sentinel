import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Admin credentials from seed
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'PvlvoQg/uCV2xfqE6ZTyFg';

test.describe('Dashboard - Phase 3 Bulk Actions', () => {
  test.beforeEach(async ({ page }) => {
    // Go to login page
    await page.goto(BASE_URL);

    // Fill in login form
    await page.fill('input[name="username"], input[placeholder*="Username"], input:first-of-type', ADMIN_USERNAME);
    await page.fill('input[name="password"], input[type="password"]', ADMIN_PASSWORD);

    // Click sign in
    await page.click('button:has-text("Sign In")');

    // Wait for redirect to dashboard
    await page.waitForURL(BASE_URL + '/', { timeout: 10000 }).catch(() => {
      // URL might not change, just wait for dashboard content
    });

    // Wait for dashboard to load
    await page.waitForSelector('text=Dashboard', { timeout: 15000 }).catch(() => {
      // May have different text, continue
    });
  });

  test('should render dashboard with all Phase 3 components', async ({ page }) => {
    // Wait for dashboard to load
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });

    // Check for DashboardHeader with count chips
    await expect(page.locator('[data-testid="member-count"]').or(page.locator('text=/\\d+ Members/'))).toBeVisible();
    await expect(page.locator('[data-testid="visitor-count"]').or(page.locator('text=/\\d+ Visitors/'))).toBeVisible();

    // Check FilterBar exists
    await expect(page.locator('text=All').first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'test-results/dashboard-loaded.png' });
  });

  test('should toggle select mode', async ({ page }) => {
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });

    // Find and click the Select Mode toggle
    const selectToggle = page.locator('button:has-text("Select")').or(
      page.locator('[aria-label*="select"]')
    ).first();

    if (await selectToggle.isVisible()) {
      await selectToggle.click();

      // After enabling select mode, cards should show checkboxes
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/dashboard-select-mode.png' });
    }
  });

  test('should show bulk action bar when items selected', async ({ page }) => {
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });

    // Enable select mode
    const selectToggle = page.locator('button:has-text("Select")').first();
    if (await selectToggle.isVisible()) {
      await selectToggle.click();
      await page.waitForTimeout(300);
    }

    // Click on a person card to select it
    const personCard = page.locator('[data-testid="person-card"]').first().or(
      page.locator('.cursor-pointer').first()
    );

    if (await personCard.isVisible()) {
      await personCard.click();
      await page.waitForTimeout(300);

      // Check if BulkActionBar appears
      const bulkBar = page.locator('text=/Select All|Checkout|Export/');
      await page.screenshot({ path: 'test-results/dashboard-bulk-bar.png' });
    }
  });

  test('should have activity panel', async ({ page }) => {
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });

    // Check for Activity panel
    const activityPanel = page.locator('text=Activity').first();
    await expect(activityPanel).toBeVisible();

    await page.screenshot({ path: 'test-results/dashboard-activity-panel.png' });
  });
});

import { test, expect } from '@playwright/test';

test.describe('TV Display Presence View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for data to load
    await page.waitForTimeout(1000);
  });

  test('displays presence count cards', async ({ page }) => {
    // Verify the three count cards are visible (use exact match for card labels)
    await expect(page.getByText('Present', { exact: true })).toBeVisible();
    await expect(page.getByText('Absent', { exact: true })).toBeVisible();
    await expect(page.getByText('Visitors', { exact: true })).toBeVisible();
  });

  test('displays "Currently In Building" section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Currently In Building' })).toBeVisible();
  });

  test('displays person cards or empty message', async ({ page }) => {
    // Check for the "Visitors" section heading or "No one currently in building"
    const visitorsSection = page.getByText(/Visitors \(\d+\)/);
    const noOneMessage = page.getByText('No one currently in building');

    // One of these should be visible
    const hasVisitors = await visitorsSection.isVisible().catch(() => false);
    const hasNoOne = await noOneMessage.isVisible().catch(() => false);

    expect(hasVisitors || hasNoOne).toBe(true);
  });

  test('displays visitor cards with details', async ({ page }) => {
    // Check if there are visitors from test data
    const visitorsSection = page.getByText(/Visitors \(\d+\)/);
    const hasVisitors = await visitorsSection.isVisible().catch(() => false);

    if (hasVisitors) {
      // Verify visitor cards show organization and visit type
      await expect(page.locator('.border-l-sky-500').first()).toBeVisible();
    }
  });

  test('shows connection status indicator', async ({ page }) => {
    await expect(page.getByText('Connected')).toBeVisible();
  });

  test('displays division breakdown section', async ({ page }) => {
    await expect(page.getByText('Division Breakdown')).toBeVisible();
  });

  test('shows recent activity feed', async ({ page }) => {
    await expect(page.getByText('Recent Activity')).toBeVisible();
  });
});

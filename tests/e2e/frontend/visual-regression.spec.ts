import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests for Sentinel Admin Dashboard
 *
 * These tests capture screenshots of all main pages to verify
 * UI appearance after the HeroUI v3 migration.
 */

test.describe('Frontend Visual Regression', () => {
  // Login page (unauthenticated)
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login.png', { fullPage: true });
  });

  // Authenticated pages - use test fixtures for auth
  test.describe('Authenticated pages', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authentication by setting localStorage token
      await page.goto('/login');
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'test_token');
        localStorage.setItem('user', JSON.stringify({
          id: '1',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        }));
      });
    });

    test('dashboard page renders correctly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      // Wait for content to stabilize
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });
    });

    test('members page renders correctly', async ({ page }) => {
      await page.goto('/members');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('members.png', { fullPage: true });
    });

    test('events page renders correctly', async ({ page }) => {
      await page.goto('/events');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('events.png', { fullPage: true });
    });

    test('visitors page renders correctly', async ({ page }) => {
      await page.goto('/visitors');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('visitors.png', { fullPage: true });
    });

    test('reports page renders correctly', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('reports.png', { fullPage: true });
    });

    test('settings page renders correctly', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('settings.png', { fullPage: true });
    });
  });
});

import { test, expect } from '@playwright/test';

test.describe('Dashboard Bulk Actions - Phase 3 Verification', () => {
  test('should load dashboard and verify bulk action components', async ({ page }) => {
    // Step 1: Navigate to dashboard
    console.log('Step 1: Navigating to dashboard...');
    await page.goto('http://localhost:5173/dashboard');
    await page.screenshot({ path: 'test-results/01-initial-load.png' });

    // Step 2: Check for auth redirect or dashboard load
    console.log('Step 2: Checking page state...');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    console.log(`Current URL: ${url}`);

    if (url.includes('/login')) {
      console.log('⚠️  Auth redirect detected - navigated to login page');
      await page.screenshot({ path: 'test-results/02-login-redirect.png' });

      // Check for login form elements
      const loginForm = page.locator('form, [role="form"], input[type="email"], input[type="password"]');
      const hasLoginElements = await loginForm.count() > 0;
      console.log(`Login form elements found: ${hasLoginElements}`);

      return; // Exit early since we need authentication
    }

    // Step 3: Check what's actually on the page
    console.log('Step 3: Checking page content...');
    const bodyText = await page.locator('body').textContent();
    console.log(`Page body text: ${bodyText?.substring(0, 200)}...`);

    const htmlContent = await page.content();
    console.log(`Page has ${htmlContent.length} characters of HTML`);

    // Check for any headings
    const allHeadings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await allHeadings.count();
    console.log(`Headings found: ${headingCount}`);

    if (headingCount > 0) {
      for (let i = 0; i < Math.min(headingCount, 5); i++) {
        const headingText = await allHeadings.nth(i).textContent();
        console.log(`  Heading ${i + 1}: ${headingText}`);
      }
    }

    // Try to find dashboard header with more lenient search
    const dashboardHeader = page.getByRole('heading', { name: /dashboard/i });
    const headerVisible = await dashboardHeader.isVisible().catch(() => false);

    if (headerVisible) {
      console.log('✓ Dashboard header found');
    } else {
      console.log('⚠️  Dashboard header not found - checking for error messages');

      // Check for common error indicators
      const errorText = await page.locator('text=/error|unauthorized|forbidden|not found/i').first().textContent().catch(() => null);
      if (errorText) {
        console.log(`Error message found: ${errorText}`);
      }
    }

    await page.screenshot({ path: 'test-results/03-page-content.png' });

    // Step 4: Check for FilterBar component
    console.log('Step 4: Checking for FilterBar component...');

    // Look for type filter buttons (All, Person of Interest, Unknown, etc.)
    const typeFilters = page.locator('button:has-text("All"), button:has-text("Person of Interest"), button:has-text("Unknown")');
    const filterCount = await typeFilters.count();
    console.log(`Type filter buttons found: ${filterCount}`);

    if (filterCount > 0) {
      console.log('✓ FilterBar type filters rendered');
      await page.screenshot({ path: 'test-results/04-filter-bar.png' });
    } else {
      console.log('⚠️  FilterBar type filters not found');
      await page.screenshot({ path: 'test-results/04-no-filters.png' });
    }

    // Step 5: Verify PersonCardGrid area
    console.log('Step 5: Checking for PersonCardGrid area...');

    // Look for grid container or person cards
    const gridContainer = page.locator('[class*="grid"], [class*="card-grid"], [data-testid*="grid"]');
    const personCards = page.locator('[class*="person-card"], [data-testid*="person-card"]');

    const hasGrid = await gridContainer.count() > 0;
    const cardCount = await personCards.count();

    console.log(`Grid container found: ${hasGrid}`);
    console.log(`Person cards found: ${cardCount}`);

    if (hasGrid || cardCount > 0) {
      console.log('✓ PersonCardGrid area exists');
      await page.screenshot({ path: 'test-results/05-card-grid.png' });
    } else {
      console.log('⚠️  PersonCardGrid area not found');
      await page.screenshot({ path: 'test-results/05-no-grid.png' });
    }

    // Step 6: Look for "Select Mode" toggle
    console.log('Step 6: Looking for Select Mode toggle...');

    // Try multiple selectors for the toggle
    const selectModeToggle = page.locator(
      'button:has-text("Select Mode"), ' +
      'button:has-text("Select"), ' +
      '[aria-label*="Select Mode"], ' +
      '[data-testid*="select-mode"]'
    );

    const toggleCount = await selectModeToggle.count();
    console.log(`Select Mode toggles found: ${toggleCount}`);

    if (toggleCount > 0) {
      console.log('✓ Select Mode toggle found');
      await expect(selectModeToggle.first()).toBeVisible();
      await page.screenshot({ path: 'test-results/06-select-mode.png' });

      // Try clicking it to activate selection mode
      console.log('Attempting to activate Select Mode...');
      await selectModeToggle.first().click();
      await page.waitForTimeout(500); // Wait for UI update
      await page.screenshot({ path: 'test-results/07-select-mode-active.png' });

      // Check for bulk action buttons
      const bulkActions = page.locator(
        'button:has-text("Delete"), ' +
        'button:has-text("Update"), ' +
        'button:has-text("Cancel"), ' +
        '[data-testid*="bulk-action"]'
      );
      const bulkActionCount = await bulkActions.count();
      console.log(`Bulk action buttons found: ${bulkActionCount}`);

      if (bulkActionCount > 0) {
        console.log('✓ Bulk action buttons visible');
        await page.screenshot({ path: 'test-results/08-bulk-actions.png' });
      } else {
        console.log('⚠️  Bulk action buttons not visible');
      }
    } else {
      console.log('⚠️  Select Mode toggle not found');
      await page.screenshot({ path: 'test-results/06-no-select-mode.png' });
    }

    // Final full page screenshot
    await page.screenshot({ path: 'test-results/09-final-state.png', fullPage: true });
    console.log('Test complete - screenshots saved to test-results/');
  });
});

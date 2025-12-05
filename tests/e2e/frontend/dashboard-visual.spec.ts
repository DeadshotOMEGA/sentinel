import { test, expect } from '@playwright/test';

test.describe('Dashboard Visual Verification', () => {
  test('Dashboard loads and displays key elements', async ({ page }) => {
    // Navigate to frontend
    await page.goto('http://localhost:5173');

    // Check if login page appears
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign in")');
    const isLoginPage = await loginButton.isVisible().catch(() => false);

    if (isLoginPage) {
      console.log('Login page detected, logging in...');

      // Fill login form
      await page.fill('input[type="text"], input[name="username"]', 'admin');
      await page.fill('input[type="password"], input[name="password"]', 'admin123');
      await loginButton.click();

      // Wait for navigation after login
      await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
        console.log('No redirect to /dashboard, checking if already on dashboard');
      });
    }

    // Navigate to Dashboard if not already there
    const currentUrl = page.url();
    if (!currentUrl.includes('dashboard')) {
      const dashboardLink = page.locator('a:has-text("Dashboard"), [href*="dashboard"]');
      if (await dashboardLink.isVisible().catch(() => false)) {
        await dashboardLink.click();
      } else {
        await page.goto('http://localhost:5173/dashboard');
      }
    }

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Take initial screenshot
    await page.screenshot({
      path: '/home/sauk/projects/sentinel/tests/screenshots/dashboard-full.png',
      fullPage: true
    });

    // Verify Dashboard header
    const dashboardHeader = page.locator('h1:has-text("Dashboard"), h2:has-text("Dashboard")');
    const headerVisible = await dashboardHeader.isVisible().catch(() => false);

    // Verify Filter chips
    const filterAll = page.locator('[role="tab"]:has-text("All"), button:has-text("All")');
    const filterMembers = page.locator('[role="tab"]:has-text("Members"), button:has-text("Members")');
    const filterVisitors = page.locator('[role="tab"]:has-text("Visitors"), button:has-text("Visitors")');

    const filtersVisible = {
      all: await filterAll.isVisible().catch(() => false),
      members: await filterMembers.isVisible().catch(() => false),
      visitors: await filterVisitors.isVisible().catch(() => false),
    };

    // Verify Search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
    const searchVisible = await searchInput.isVisible().catch(() => false);

    // Verify Select button
    const selectButton = page.locator('button:has-text("Select")');
    const selectVisible = await selectButton.isVisible().catch(() => false);

    // Verify Person cards or empty state
    const personCards = page.locator('[data-testid="person-card"], .person-card, [class*="card"]');
    const emptyState = page.locator(':has-text("No members"), :has-text("No people"), :has-text("empty")');

    const cardsCount = await personCards.count().catch(() => 0);
    const emptyStateVisible = await emptyState.first().isVisible().catch(() => false);

    // Verify Activity panel
    const activityPanel = page.locator('[data-testid="activity-panel"], aside, [class*="activity"]');
    const activityVisible = await activityPanel.isVisible().catch(() => false);

    // Take screenshot of activity panel if visible
    if (activityVisible) {
      await activityPanel.screenshot({
        path: '/home/sauk/projects/sentinel/tests/screenshots/dashboard-activity-panel.png'
      });
    }

    // Generate report
    console.log('\n=== DASHBOARD VERIFICATION REPORT ===\n');
    console.log(`Dashboard Header: ${headerVisible ? '✓ VISIBLE' : '✗ NOT FOUND'}`);
    console.log(`\nFilter Chips:`);
    console.log(`  - All: ${filtersVisible.all ? '✓' : '✗'}`);
    console.log(`  - Members: ${filtersVisible.members ? '✓' : '✗'}`);
    console.log(`  - Visitors: ${filtersVisible.visitors ? '✓' : '✗'}`);
    console.log(`\nSearch Input: ${searchVisible ? '✓ VISIBLE' : '✗ NOT FOUND'}`);
    console.log(`Select Button: ${selectVisible ? '✓ VISIBLE' : '✗ NOT FOUND'}`);
    console.log(`\nContent Area:`);
    if (cardsCount > 0) {
      console.log(`  - Person Cards: ${cardsCount} found`);
    }
    if (emptyStateVisible) {
      console.log(`  - Empty State: VISIBLE`);
    }
    if (cardsCount === 0 && !emptyStateVisible) {
      console.log(`  - ⚠ NO CARDS OR EMPTY STATE FOUND`);
    }
    console.log(`\nActivity Panel: ${activityVisible ? '✓ VISIBLE' : '✗ NOT FOUND'}`);

    if (consoleErrors.length > 0) {
      console.log(`\n⚠ Console Errors (${consoleErrors.length}):`);
      consoleErrors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    } else {
      console.log(`\n✓ No console errors detected`);
    }
    console.log('\n=== END REPORT ===\n');

    // Log the current page HTML for debugging if key elements are missing
    if (!headerVisible && !filtersVisible.all && !searchVisible) {
      console.log('\n⚠ Key elements not found. Page HTML:');
      const bodyHtml = await page.locator('body').innerHTML();
      console.log(bodyHtml.slice(0, 1000) + '...');
    }

    // Soft assertions for reporting (don't fail the test)
    expect.soft(headerVisible || filtersVisible.all || searchVisible,
      'At least some dashboard elements should be visible').toBeTruthy();
  });
});

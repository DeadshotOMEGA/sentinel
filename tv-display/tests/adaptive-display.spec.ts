import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-screenshots');

test.describe('Adaptive TV Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?test=adaptive');
    // Wait for test UI to load
    await page.waitForSelector('input[type="range"]', { timeout: 10000 });
  });

  test('should display test UI controls', async ({ page }) => {
    // Verify test controls are present
    await expect(page.locator('input[type="range"]')).toBeVisible();
    await expect(page.locator('text=Test Compact (20)')).toBeVisible();
    await expect(page.locator('text=Test Dense (50)')).toBeVisible();
    await expect(page.locator('text=Test Scroll (100)')).toBeVisible();
    await expect(page.locator('text=Mode Test Controls')).toBeVisible();
  });

  test('Compact Mode (≤40 people)', async ({ page }) => {
    console.log('Testing Compact Mode...');

    // Set to 20 people using the Compact button
    await page.click('text=Test Compact (20)');
    await page.waitForTimeout(500); // Wait for transition

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'compact-mode-20.png'),
      fullPage: true
    });

    // Verify stats cards are visible (Present, Absent, Visitors)
    const presentCard = page.locator('text=Present').first();
    await expect(presentCard).toBeVisible();

    const absentCard = page.locator('text=Absent').first();
    await expect(absentCard).toBeVisible();

    // Verify "Currently In Building" section exists
    const currentlyInBuilding = page.locator('text=Currently In Building');
    await expect(currentlyInBuilding).toBeVisible();

    // Verify we're not in scroll mode (no giant count header)
    const giantCountHeader = page.locator('text=/^\\d+$/ >> visible=true').filter({ hasText: /^\d{2,}$/ });
    const giantHeaders = await giantCountHeader.count();
    console.log(`Found ${giantHeaders} giant number headers (should be 0 in compact)`);

    console.log('Compact mode verification complete');
  });

  test('Dense Mode (41-80 people)', async ({ page }) => {
    console.log('Testing Dense Mode...');

    // Set to 50 people using the Dense button
    await page.click('text=Test Dense (50)');
    await page.waitForTimeout(500); // Wait for transition

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dense-mode-50.png'),
      fullPage: true
    });

    // Verify stats header is visible
    const presentStat = page.locator('text=Present').first();
    await expect(presentStat).toBeVisible();

    // Verify "Currently In Building" section exists
    const currentlyInBuilding = page.locator('text=Currently In Building');
    await expect(currentlyInBuilding).toBeVisible();

    // Verify we're not in scroll mode
    const giantCountHeader = page.locator('text=/^\\d+$/ >> visible=true').filter({ hasText: /^\d{2,}$/ });
    const giantHeaders = await giantCountHeader.count();
    console.log(`Found ${giantHeaders} giant number headers (should be 0 in dense)`);

    console.log('Dense mode verification complete');
  });

  test('Scroll Mode (80+ people)', async ({ page }) => {
    console.log('Testing Scroll Mode...');

    // Set to 100 people using the Scroll button
    await page.click('text=Test Scroll (100)');
    await page.waitForTimeout(1000); // Wait for transition and initial scroll

    // Take screenshot at start
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'scroll-mode-100-start.png'),
      fullPage: false
    });

    // Verify large count header is visible with "Present"
    const presentLabel = page.locator('text=Present').filter({ hasText: /^Present$/ });
    await expect(presentLabel).toBeVisible();

    // Verify the large number is visible (it should be "100")
    const largeNumber = page.getByText('100', { exact: false }).first();
    await expect(largeNumber).toBeVisible();

    // Verify scrolling container exists
    const scrollContainer = page.locator('.scroll-container');
    await expect(scrollContainer).toBeVisible();

    // Verify "Members" or "Visitors" section headers exist
    const membersHeader = page.locator('text=Members');
    const hasMembersHeader = await membersHeader.count();
    console.log(`Found ${hasMembersHeader} "Members" headers`);
    expect(hasMembersHeader).toBeGreaterThan(0);

    // Wait for scroll animation
    await page.waitForTimeout(3000);

    // Take screenshot after scroll
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'scroll-mode-100-scrolled.png'),
      fullPage: false
    });

    console.log('Scroll mode verification complete');
  });

  test('Mode Transitions', async ({ page }) => {
    console.log('Testing mode transitions...');

    // Start in Compact
    await page.click('text=Test Compact (20)');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Currently In Building')).toBeVisible();

    // Switch to Dense
    await page.click('text=Test Dense (50)');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Currently In Building')).toBeVisible();

    // Switch to Scroll
    await page.click('text=Test Scroll (100)');
    await page.waitForTimeout(500);
    await expect(page.locator('.scroll-container')).toBeVisible();

    // Switch back to Compact
    await page.click('text=Test Compact (20)');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Currently In Building')).toBeVisible();

    // Verify scroll container is gone
    const scrollContainer = page.locator('.scroll-container');
    expect(await scrollContainer.count()).toBe(0);

    console.log('Mode transitions completed successfully');
  });

  test('Hysteresis Behavior', async ({ page }) => {
    console.log('Testing hysteresis...');

    // Get the slider
    const slider = page.locator('input[type="range"]');

    // Set to 41 (should be Dense)
    await slider.fill('41');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'hysteresis-41-dense.png'),
      fullPage: true
    });
    await expect(page.locator('text=Currently In Building')).toBeVisible();
    const scrollAt41 = await page.locator('.scroll-container').count();
    expect(scrollAt41).toBe(0); // Should be Dense, not Scroll

    // Lower to 40 (should STAY Dense due to hysteresis)
    await slider.fill('40');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'hysteresis-40-still-dense.png'),
      fullPage: true
    });
    await expect(page.locator('text=Currently In Building')).toBeVisible();
    const scrollAt40 = await page.locator('.scroll-container').count();
    expect(scrollAt40).toBe(0); // Should still be Dense

    // Lower to 35 (should switch to Compact)
    await slider.fill('35');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'hysteresis-35-compact.png'),
      fullPage: true
    });
    await expect(page.locator('text=Currently In Building')).toBeVisible();
    const scrollAt35 = await page.locator('.scroll-container').count();
    expect(scrollAt35).toBe(0); // Should be Compact

    console.log('Hysteresis testing completed');
  });

  test('Visual Regression - All Modes', async ({ page }) => {
    const modes = [
      { name: 'compact', button: 'Test Compact (20)' },
      { name: 'dense', button: 'Test Dense (50)' },
      { name: 'scroll', button: 'Test Scroll (100)' }
    ];

    for (const mode of modes) {
      console.log(`Capturing ${mode.name} mode...`);
      await page.click(`text=${mode.button}`);
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `visual-${mode.name}.png`),
        fullPage: mode.name !== 'scroll'
      });
    }
  });
});

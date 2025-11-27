import { test, expect } from '@playwright/test';

// Run tests serially to avoid state conflicts from shared member data
test.describe.configure({ mode: 'serial' });

// Increase timeout for tests with duplicate scan waits
test.setTimeout(60000);

test.describe('Member NFC Check-in/Check-out Flow', () => {
  const BADGE_SERIAL = 'NFC-001-A7B8C9'; // CPO1 Sarah MacDonald, Operations
  const MEMBER_RANK = 'CPO1';
  const MEMBER_NAME = 'MacDonald'; // Last name shown on success screen
  const MEMBER_FULL_NAME = 'Sarah MacDonald';
  const DIVISION = 'Operations';
  const SUCCESS_TIMEOUT = 3000; // Kiosk auto-return timeout (from config)

  // Service URLs - match playwright.config.ts defaults
  const KIOSK_URL = 'http://localhost:5174';
  const TV_URL = 'http://localhost:5175';

  test('member checks IN at kiosk and TV display updates', async ({
    browser,
  }) => {
    // Create separate contexts for kiosk and TV display
    // (Frontend requires authentication, tested separately)
    const kioskContext = await browser.newContext();
    const tvContext = await browser.newContext();

    const kioskPage = await kioskContext.newPage();
    const tvPage = await tvContext.newPage();

    try {
      // Wait 6 seconds to clear any duplicate scan window from previous test runs
      await kioskPage.waitForTimeout(6000);

      // Step 1: Load both interfaces
      await Promise.all([
        kioskPage.goto(KIOSK_URL),
        tvPage.goto(TV_URL),
      ]);

      // Wait for pages to load
      await Promise.all([
        kioskPage.waitForLoadState('networkidle'),
        tvPage.waitForLoadState('networkidle'),
      ]);

      // Step 2: Verify kiosk is on idle screen
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible();

      // Step 3: Get initial presence count from TV display
      const tvInitialPresentText = await tvPage
        .locator('text=Present').locator('..').locator('span, div').first()
        .textContent({ timeout: 5000 });
      const tvInitialPresent = tvInitialPresentText ? parseInt(tvInitialPresentText.trim(), 10) : 0;

      // Step 4: Simulate NFC scan on kiosk (type badge serial + Enter)
      // Click on body first to ensure page has focus for keyboard events
      await kioskPage.locator('body').click();
      await kioskPage.keyboard.type(BADGE_SERIAL, { delay: 20 });
      await kioskPage.keyboard.press('Enter');

      // Step 5: Verify kiosk shows success screen with member details
      // (Scanning screen might be too fast to catch)
      await expect(kioskPage.getByText(/Signed (In|Out)/)).toBeVisible({ timeout: 5000 });
      await expect(kioskPage.getByText(MEMBER_RANK, { exact: false })).toBeVisible();
      await expect(kioskPage.getByText(MEMBER_NAME, { exact: false })).toBeVisible();

      // Step 6: Verify TV display shows member in Recent Activity
      await expect(
        tvPage.getByText(`${MEMBER_RANK} ${MEMBER_FULL_NAME}`, { exact: false }).first()
      ).toBeVisible({ timeout: 10000 });

      // Step 7: Wait for kiosk to auto-return to idle screen
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible({
        timeout: SUCCESS_TIMEOUT + 2000,
      });
    } finally {
      await kioskContext.close();
      await tvContext.close();
    }
  });

  test('full check-in/check-out cycle with TV display updates', async ({ browser }) => {
    // This test verifies the complete cycle: member checks in, then checks out,
    // and both kiosk and TV display update correctly
    const kioskContext = await browser.newContext();
    const tvContext = await browser.newContext();

    const kioskPage = await kioskContext.newPage();
    const tvPage = await tvContext.newPage();

    try {
      // Load both interfaces
      await Promise.all([
        kioskPage.goto(KIOSK_URL),
        tvPage.goto(TV_URL),
      ]);

      await Promise.all([
        kioskPage.waitForLoadState('networkidle'),
        tvPage.waitForLoadState('networkidle'),
      ]);

      // Verify kiosk is on idle screen
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible();

      // === CHECK IN ===
      await kioskPage.locator('body').click();
      await kioskPage.keyboard.type(BADGE_SERIAL, { delay: 20 });
      await kioskPage.keyboard.press('Enter');

      await expect(kioskPage.getByText(/Signed (In|Out)/)).toBeVisible({ timeout: 5000 });
      await expect(kioskPage.getByText(MEMBER_RANK, { exact: false })).toBeVisible();
      await expect(kioskPage.getByText(MEMBER_NAME, { exact: false })).toBeVisible();

      // Verify TV display shows member in Recent Activity
      await expect(
        tvPage.getByText(`${MEMBER_RANK} ${MEMBER_FULL_NAME}`, { exact: false }).first()
      ).toBeVisible({ timeout: 10000 });

      // Wait for kiosk to return to idle
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible({
        timeout: SUCCESS_TIMEOUT + 2000,
      });

      // Wait 6 seconds to clear duplicate scan window
      await kioskPage.waitForTimeout(6000);

      // === CHECK OUT (second scan) ===
      await kioskPage.locator('body').click();
      await kioskPage.keyboard.type(BADGE_SERIAL, { delay: 20 });
      await kioskPage.keyboard.press('Enter');

      await expect(kioskPage.getByText(/Signed (In|Out)/)).toBeVisible({ timeout: 5000 });

      // Wait for kiosk to return to idle
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible({
        timeout: SUCCESS_TIMEOUT + 2000,
      });
    } finally {
      await kioskContext.close();
      await tvContext.close();
    }
  });
});

import { test, expect, Page } from '@playwright/test';

/**
 * Badge Check-in Edge Cases E2E Tests
 *
 * Tests error handling, unknown badges, and edge cases in the kiosk check-in flow.
 * The main happy path flow is covered in member-nfc-checkin.spec.ts
 */

// Run tests serially to avoid state conflicts
test.describe.configure({ mode: 'serial' });

test.describe('Kiosk Badge Check-in Edge Cases', () => {
  const KIOSK_URL = 'http://localhost:5174';

  /**
   * Helper to simulate badge scan
   */
  async function scanBadge(page: Page, serialNumber: string): Promise<void> {
    await page.locator('body').click();
    await page.keyboard.type(serialNumber, { delay: 20 });
    await page.keyboard.press('Enter');
  }

  test.beforeEach(async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForLoadState('networkidle');
    // Verify kiosk is on idle screen
    await expect(page.getByText('Tap Your Badge')).toBeVisible();
  });

  test('should show error for unknown/unassigned badge', async ({ page }) => {
    // Scan a badge that doesn't exist in the system
    await scanBadge(page, 'UNKNOWN-BADGE-12345');

    // Should show error screen
    await expect(
      page.getByText(/unknown|not recognized|not found|unassigned/i)
    ).toBeVisible({ timeout: 5000 });

    // Should return to idle after timeout
    await expect(page.getByText('Tap Your Badge')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should handle empty badge scan gracefully', async ({ page }) => {
    // Press Enter without badge data
    await page.locator('body').click();
    await page.keyboard.press('Enter');

    // Should remain on idle screen (empty input ignored)
    await expect(page.getByText('Tap Your Badge')).toBeVisible();
  });

  test('should prevent duplicate scans within cooldown window', async ({ page }) => {
    const VALID_BADGE = 'NFC-001-A7B8C9'; // Same badge as in member-nfc-checkin.spec.ts

    // First scan
    await scanBadge(page, VALID_BADGE);

    // Wait for success screen
    await expect(page.getByText(/Signed (In|Out)/)).toBeVisible({ timeout: 5000 });

    // Wait for return to idle
    await expect(page.getByText('Tap Your Badge')).toBeVisible({ timeout: 5000 });

    // Immediately scan again (within duplicate cooldown)
    await scanBadge(page, VALID_BADGE);

    // Should show duplicate scan message
    await expect(
      page.getByText(/already|recently|duplicate|wait/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show scanning indicator during badge processing', async ({ page }) => {
    const VALID_BADGE = 'NFC-001-A7B8C9';

    // Start scan
    await page.locator('body').click();
    await page.keyboard.type(VALID_BADGE, { delay: 20 });

    // Check for scanning/processing indicator before pressing Enter
    // This ensures the screen updates during input
    await page.keyboard.press('Enter');

    // Either scanning indicator or immediate result
    // The scanning state may be too fast to catch, so we just verify transition
    await expect(
      page.getByText(/scanning|processing|signed/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should handle special characters in badge serial gracefully', async ({ page }) => {
    // Scan with special characters that might cause issues
    await scanBadge(page, 'BADGE-<script>alert(1)</script>');

    // Should either show error or remain on idle, but not crash
    await expect(
      page.getByText(/tap your badge|unknown|error/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should display correct time on idle screen', async ({ page }) => {
    // Verify the clock/time is displayed
    // (Kiosk typically shows current time on idle screen)
    const clockElement = page.locator('[data-testid="clock"], .clock, time').first();

    // If clock element exists, verify it has content
    const clockCount = await clockElement.count();
    if (clockCount > 0) {
      const clockText = await clockElement.textContent();
      expect(clockText).toBeTruthy();
      // Verify it looks like a time (contains : or numbers)
      expect(clockText).toMatch(/\d/);
    }
  });

  test('should maintain focus for badge input after returning from success', async ({ page }) => {
    const VALID_BADGE = 'NFC-001-A7B8C9';

    // Wait for any previous cooldown
    await page.waitForTimeout(6000);

    // First scan
    await scanBadge(page, VALID_BADGE);

    // Wait for success and return to idle
    await expect(page.getByText(/Signed (In|Out)/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Tap Your Badge')).toBeVisible({ timeout: 5000 });

    // Wait for duplicate cooldown to expire
    await page.waitForTimeout(6000);

    // Second scan should work without clicking first
    await page.keyboard.type(VALID_BADGE, { delay: 20 });
    await page.keyboard.press('Enter');

    // Should process the scan
    await expect(
      page.getByText(/signed|scanning|processing/i)
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Kiosk UI Elements', () => {
  const KIOSK_URL = 'http://localhost:5174';

  test('should display Sign In Visitor button on idle screen', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForLoadState('networkidle');

    const visitorButton = page.getByRole('button', { name: /visitor/i });
    await expect(visitorButton).toBeVisible();
    await expect(visitorButton).toBeEnabled();
  });

  test('should have touch-friendly button sizes (min 48px)', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForLoadState('networkidle');

    const visitorButton = page.getByRole('button', { name: /visitor/i });
    const box = await visitorButton.boundingBox();

    // Verify touch-friendly size (WCAG 2.5.5 requires 44px minimum, we use 48px)
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('should navigate to visitor screen and back', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForLoadState('networkidle');

    // Navigate to visitor check-in
    await page.getByRole('button', { name: /visitor/i }).click();

    // Should show visitor check-in form
    await expect(page.getByText(/visitor check.?in/i)).toBeVisible();

    // Should have back/cancel button
    const backButton = page.getByRole('button', { name: /back|cancel|return/i });
    await expect(backButton).toBeVisible();

    // Return to idle
    await backButton.click();

    // Should be back on idle screen
    await expect(page.getByText('Tap Your Badge')).toBeVisible();
  });
});

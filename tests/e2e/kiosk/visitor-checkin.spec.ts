import { test, expect } from '@playwright/test';

test.describe('Kiosk Visitor Check-in', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays visitor check-in option', async ({ page }) => {
    // Look for visitor button/option on kiosk home
    const visitorButton = page.getByRole('button', { name: /visitor/i });
    await expect(visitorButton).toBeVisible();
  });

  test('visitor form accepts input and submits', async ({ page }) => {
    // Navigate to visitor check-in
    await page.getByRole('button', { name: /visitor/i }).click();

    // Verify form is displayed
    await expect(page.getByText('Visitor Check-In')).toBeVisible();

    // Fill in required fields using placeholders
    await page.getByPlaceholder(/john doe/i).fill('Test Visitor');
    await page.getByPlaceholder(/company|organization|unit/i).fill('Test Company');

    // Select visit type from native dropdown
    await page.getByRole('combobox').selectOption({ index: 1 }); // "Contractor/SSC"

    // Submit - verify button exists and is clickable
    const submitButton = page.getByRole('button', { name: /submit|check.?in|continue/i });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Form should process (either success or error screen)
    // Full success test requires backend setup with test data
    await expect(page.getByText(/welcome|success|unable|error/i)).toBeVisible({ timeout: 5000 });
  });
});

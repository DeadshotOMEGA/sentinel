import { test, expect } from '@playwright/test';

/**
 * PersonDetailModal E2E Tests
 *
 * Tests the modal that opens when clicking on person cards in the Dashboard.
 * Verifies all modal elements are present and functional.
 */

test.describe('PersonDetailModal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('http://localhost:5173');

    // Check if we need to login by looking for username field
    const usernameField = page.getByLabel(/username/i);
    const isLoginPage = await usernameField.isVisible({ timeout: 1000 }).catch(() => false);

    if (isLoginPage) {
      await usernameField.fill('admin');
      await page.getByLabel(/password/i).fill('admin123');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for login to complete - check for Dashboard text or Members link
      await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    }

    // Wait for dashboard to load by checking for person cards (using role="button" + "Member" chip to identify cards)
    await page.waitForSelector('text=Member', { timeout: 10000 });
  });

  test('should open modal with all required elements when clicking a person card', async ({ page }) => {
    // Wait a moment for any animations to complete
    await page.waitForTimeout(500);

    // Find the first person card using the test ID
    const personCard = page.locator('[data-testid="person-card"]').first();

    // Get person name from the card
    const personName = await personCard.locator('[data-testid="person-name"]').textContent();

    // Click the person card
    await personCard.click();

    // Wait for modal to open
    const modal = page.locator('[data-testid="person-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Take screenshot of the open modal
    await page.screenshot({
      path: '/home/sauk/projects/sentinel/tests/screenshots/person-detail-modal-open.png',
      fullPage: true
    });

    // Verify modal elements
    // 1. Person name
    if (!personName) {
      throw new Error('Person name not found on card');
    }
    const modalPersonName = modal.locator('[data-testid="modal-person-name"]');
    await expect(modalPersonName).toBeVisible();
    await expect(modalPersonName).toHaveText(personName);

    // 2. Avatar
    const avatar = modal.locator('[data-testid="modal-avatar"]');
    await expect(avatar).toBeVisible();

    // 3. Type badge (Member or Visitor)
    const typeBadge = modal.locator('[data-testid="modal-type-badge"]');
    await expect(typeBadge).toBeVisible();
    const badgeText = await typeBadge.textContent();
    if (!badgeText) {
      throw new Error('Badge text is null');
    }
    expect(['Member', 'Visitor']).toContain(badgeText.trim());

    // 4. Check-in time
    await expect(modal.locator('text=Check-in Time')).toBeVisible();

    // 5. Details section - check for either Division (member) or Organization (visitor)
    const divisionLabel = modal.locator('text=Division');
    const organizationLabel = modal.locator('text=Organization');
    const hasDetails = await divisionLabel.isVisible() || await organizationLabel.isVisible();
    expect(hasDetails).toBeTruthy();

    // 6. Check Out button
    const checkoutButton = modal.getByRole('button', { name: /check out/i });
    await expect(checkoutButton).toBeVisible();

    // 7. Edit button (only for visitors)
    const isVisitor = badgeText.trim() === 'Visitor';
    if (isVisitor) {
      const editButton = modal.getByRole('button', { name: /edit/i });
      await expect(editButton).toBeVisible();
    }

    // Take a close-up screenshot of the modal content
    await modal.screenshot({
      path: '/home/sauk/projects/sentinel/tests/screenshots/person-detail-modal-content.png'
    });
  });

  test('should close modal when clicking Close button', async ({ page }) => {
    // Find and click a person card
    const personCard = page.locator('[data-testid="person-card"]').first();
    await personCard.click();

    // Wait for modal to open
    const modal = page.locator('[data-testid="person-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Find and click the Close button in the footer (use .last() to get footer button, not X button)
    const closeButton = modal.getByRole('button', { name: /close/i }).last();
    await closeButton.click();

    // Verify modal is closed
    await expect(modal).not.toBeVisible({ timeout: 2000 });
  });

  test('should close modal when pressing Escape key', async ({ page }) => {
    // Find and click a person card
    const personCard = page.locator('[data-testid="person-card"]').first();
    await personCard.click();

    // Wait for modal to open
    const modal = page.locator('[data-testid="person-detail-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Press Escape key
    await page.keyboard.press('Escape');

    // Verify modal is closed
    await expect(modal).not.toBeVisible({ timeout: 2000 });
  });

  test('should display correct person type badge for multiple people', async ({ page }) => {
    // Get all person cards
    const personCards = page.locator('[data-testid="person-card"]');
    const count = await personCards.count();

    // Test at least the first 3 cards (or all if less than 3)
    const testCount = Math.min(count, 3);

    for (let i = 0; i < testCount; i++) {
      const card = personCards.nth(i);
      await card.click();

      // Wait for modal
      const modal = page.locator('[data-testid="person-detail-modal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Verify badge exists and has valid text
      const typeBadge = modal.locator('[data-testid="modal-type-badge"]');
      await expect(typeBadge).toBeVisible();
      const badgeText = await typeBadge.textContent();
      if (!badgeText) {
        throw new Error('Badge text is null');
      }
      expect(['Member', 'Visitor']).toContain(badgeText.trim());

      // Close modal (use .last() to get footer button, not X button)
      await modal.getByRole('button', { name: /close/i }).last().click();
      await expect(modal).not.toBeVisible({ timeout: 2000 });
    }
  });
});

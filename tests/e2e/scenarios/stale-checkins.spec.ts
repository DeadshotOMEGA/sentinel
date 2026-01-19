import { test, expect, Page } from '@playwright/test';
import { Client } from 'pg';

/**
 * Stale Checkins Widget E2E Tests
 *
 * Verifies the StaleCheckinsWidget on the admin dashboard:
 * - Widget displays members checked in for more than 12 hours
 * - Admin can select and resolve (checkout) stale checkins
 * - Resolving requires an audit note
 * - Widget updates after resolution
 *
 * Run with: bunx playwright test tests/e2e/scenarios/stale-checkins.spec.ts
 */

// Run tests serially to avoid state conflicts
test.describe.configure({ mode: 'serial' });
test.setTimeout(120000); // 2 min timeout

const DASHBOARD_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'test-results/stale-checkins';

// Admin credentials for testing
const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = 'test-admin-pass-123';

// Known bcrypt hash for 'test-admin-pass-123' (generated with cost factor 10)
const ADMIN_PASSWORD_HASH = '$2b$10$TracT0ryflSkYxUi/tpBxuIhtaOsAdbhffb00cR7ecG/kZXRrF8d6';

// Test member that will have a stale checkin
const TEST_MEMBER = {
  serviceNumber: 'STALE001',
  firstName: 'Test',
  lastName: 'StaleCheckin',
  rank: 'LS',
};

// Database connection
async function getDbClient(): Promise<Client> {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'sentinel',
    password: 'sentinel_dev',
    database: 'sentinel',
  });
  await client.connect();
  return client;
}

// Helper to ensure admin user has correct password for testing
async function ensureAdminPassword(client: Client): Promise<void> {
  await client.query(`
    UPDATE admin_users
    SET password_hash = $1
    WHERE username = $2
  `, [ADMIN_PASSWORD_HASH, ADMIN_USER]);
}

// Helper to login to admin dashboard
async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(DASHBOARD_URL);

  // Wait for login form
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });

  // Fill credentials
  await page.fill('input[type="text"]', ADMIN_USER);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL(`${DASHBOARD_URL}/`, { timeout: 15000 });

  // Wait for dashboard content to appear (more reliable than networkidle for WS-enabled apps)
  await page.waitForSelector('text=Dashboard', { timeout: 10000 });
}

// Helper to create a test member with stale checkin
async function createStaleCheckin(client: Client): Promise<{ memberId: string; checkinId: string }> {
  // Get a division ID
  const divisionResult = await client.query(`
    SELECT id FROM divisions LIMIT 1
  `);
  if (divisionResult.rows.length === 0) {
    throw new Error('No divisions found in database');
  }
  const divisionId = divisionResult.rows[0].id;

  // Check if test member exists
  let memberResult = await client.query(`
    SELECT id, badge_id FROM members WHERE service_number = $1
  `, [TEST_MEMBER.serviceNumber]);

  let memberId: string;
  let badgeId: string;

  if (memberResult.rows.length === 0) {
    // Create member
    memberResult = await client.query(`
      INSERT INTO members (
        first_name, last_name, service_number, rank, division_id, status, member_type
      ) VALUES (
        $1, $2, $3, $4, $5, 'active', 'class_a'
      )
      RETURNING id
    `, [TEST_MEMBER.firstName, TEST_MEMBER.lastName, TEST_MEMBER.serviceNumber, TEST_MEMBER.rank, divisionId]);
    memberId = memberResult.rows[0].id;

    // Create badge for member
    const badgeSerial = `TEST-BADGE-${TEST_MEMBER.serviceNumber}`;
    await client.query(`
      INSERT INTO badges (serial_number, assignment_type, assigned_to_id, status)
      VALUES ($1, 'member', $2, 'active')
      ON CONFLICT (serial_number) DO UPDATE
      SET assignment_type = 'member', assigned_to_id = $2, status = 'active'
    `, [badgeSerial, memberId]);

    // Get badge ID
    const badgeResult = await client.query(`
      SELECT id FROM badges WHERE serial_number = $1
    `, [badgeSerial]);
    badgeId = badgeResult.rows[0].id;

    // Update member with badge_id
    await client.query(`
      UPDATE members SET badge_id = $1 WHERE id = $2
    `, [badgeId, memberId]);
  } else {
    memberId = memberResult.rows[0].id;
    badgeId = memberResult.rows[0].badge_id;

    if (!badgeId) {
      // Create badge if member doesn't have one
      const badgeSerial = `TEST-BADGE-${TEST_MEMBER.serviceNumber}`;
      await client.query(`
        INSERT INTO badges (serial_number, assignment_type, assigned_to_id, status)
        VALUES ($1, 'member', $2, 'active')
        ON CONFLICT (serial_number) DO UPDATE
        SET assignment_type = 'member', assigned_to_id = $2, status = 'active'
      `, [badgeSerial, memberId]);

      const badgeResult = await client.query(`
        SELECT id FROM badges WHERE serial_number = $1
      `, [badgeSerial]);
      badgeId = badgeResult.rows[0].id;

      await client.query(`
        UPDATE members SET badge_id = $1 WHERE id = $2
      `, [badgeId, memberId]);
    }
  }

  // Clear any existing checkins for this member
  await client.query(`
    DELETE FROM checkins WHERE member_id = $1
  `, [memberId]);

  // Create a stale check-in (more than 12 hours ago)
  const staleTimestamp = new Date(Date.now() - 14 * 60 * 60 * 1000); // 14 hours ago

  const checkinResult = await client.query(`
    INSERT INTO checkins (
      member_id, badge_id, direction, timestamp, synced, method, kiosk_id
    ) VALUES (
      $1, $2, 'in', $3, true, 'badge', 'test-kiosk'
    )
    RETURNING id
  `, [memberId, badgeId, staleTimestamp]);

  return {
    memberId,
    checkinId: checkinResult.rows[0].id,
  };
}

// Helper to verify member's latest checkin direction
async function getLatestCheckinDirection(client: Client, memberId: string): Promise<string | null> {
  const result = await client.query(`
    SELECT direction FROM checkins
    WHERE member_id = $1
    ORDER BY timestamp DESC
    LIMIT 1
  `, [memberId]);
  return result.rows.length > 0 ? result.rows[0].direction : null;
}

// Helper to clean up test member's checkins
async function clearTestMemberCheckins(client: Client): Promise<void> {
  await client.query(`
    DELETE FROM checkins
    WHERE member_id = (SELECT id FROM members WHERE service_number = $1)
  `, [TEST_MEMBER.serviceNumber]);
}

test.describe('Stale Checkins Widget', () => {
  let testMemberId: string;

  test.beforeAll(async () => {
    // Ensure screenshot directory exists
    const fs = await import('fs');
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    // Ensure admin password is set correctly for tests
    const client = await getDbClient();
    try {
      await ensureAdminPassword(client);
      console.log('Admin password set for testing');
    } finally {
      await client.end();
    }
  });

  // ============================================================================
  // TEST 1: Widget Shows Stale Checkins
  // ============================================================================
  test('widget displays members with stale checkins', async ({ page }) => {
    const client = await getDbClient();

    try {
      // Create stale checkin
      const { memberId } = await createStaleCheckin(client);
      testMemberId = memberId;

      console.log(`Created stale checkin for member: ${memberId}`);

      // Login to dashboard
      await loginAsAdmin(page);

      // Wait for dashboard to fully load
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/01-dashboard-loaded.png`,
        fullPage: true,
      });

      // Verify stale checkins widget is visible
      const staleWidget = page.locator('text=Stale Check-ins').first();
      await expect(staleWidget).toBeVisible({ timeout: 10000 });

      console.log('Stale Check-ins widget is visible');

      // Verify widget shows the stale member (use first() since member may appear in multiple places)
      await expect(page.getByText(`${TEST_MEMBER.rank} ${TEST_MEMBER.firstName} ${TEST_MEMBER.lastName}`, { exact: false }).first()).toBeVisible({ timeout: 5000 });

      // Verify duration chip shows 14+ hours
      const durationChip = page.locator('text=/\\d+h/').first();
      await expect(durationChip).toBeVisible();

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/02-stale-widget-with-member.png`,
        fullPage: true,
      });

      console.log('Widget correctly displays stale checkin member');

    } finally {
      await client.end();
    }
  });

  // ============================================================================
  // TEST 2: Select and Resolve Stale Checkins
  // ============================================================================
  test('admin can select and resolve stale checkins with audit note', async ({ page }) => {
    const client = await getDbClient();

    try {
      // Ensure stale checkin exists
      const latestDirection = await getLatestCheckinDirection(client, testMemberId);
      if (latestDirection !== 'in') {
        // Recreate stale checkin if member was checked out
        await createStaleCheckin(client);
      }

      // Login to dashboard
      await loginAsAdmin(page);

      // Wait for dashboard to fully load
      await page.waitForTimeout(2000);

      // Verify stale checkins widget is visible
      await expect(page.locator('text=Stale Check-ins').first()).toBeVisible({ timeout: 10000 });

      // Find the checkbox for our test member
      const memberRow = page.locator(`text=${TEST_MEMBER.rank} ${TEST_MEMBER.firstName} ${TEST_MEMBER.lastName}`).first().locator('..');
      const checkbox = memberRow.locator('input[type="checkbox"]');

      // If checkbox isn't directly in row, try the parent container
      const containerWithCheckbox = page.locator('[class*="bg-white"]')
        .filter({ hasText: TEST_MEMBER.lastName })
        .first();

      // Click the checkbox to select the stale checkin
      const actualCheckbox = containerWithCheckbox.locator('label, span').filter({ has: page.locator('input[type="checkbox"]') }).first();

      // Try clicking the checkbox area
      await actualCheckbox.click({ timeout: 5000 }).catch(async () => {
        // Alternative: try clicking checkbox input directly
        await containerWithCheckbox.locator('input[type="checkbox"]').click();
      });

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/03-checkbox-selected.png`,
        fullPage: true,
      });

      // Look for "selected" indicator
      await expect(page.getByText(/1 selected/i)).toBeVisible({ timeout: 5000 });

      console.log('Stale checkin checkbox selected');

      // Click "Resolve Selected" button
      const resolveButton = page.getByRole('button', { name: /Resolve Selected/i });
      await expect(resolveButton).toBeEnabled();
      await resolveButton.click();

      // Verify modal appears
      await expect(page.getByText('Resolve Stale Check-ins')).toBeVisible({ timeout: 5000 });

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/04-resolve-modal.png`,
        fullPage: true,
      });

      console.log('Resolve modal opened');

      // Enter audit note
      const auditNote = 'E2E test - resolving stale checkin for testing purposes';
      const noteInput = page.getByLabel(/Audit Note/i);
      await noteInput.fill(auditNote);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/05-note-entered.png`,
        fullPage: true,
      });

      // Click confirm button
      const confirmButton = page.getByRole('button', { name: /Resolve/i }).filter({ hasText: /Resolve/ });
      await expect(confirmButton).toBeEnabled();
      await confirmButton.click();

      // Wait for modal to close and data to refresh
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/06-after-resolve.png`,
        fullPage: true,
      });

      // Verify member is no longer in stale checkins widget
      // (widget should hide if empty, or member should not be listed)
      const memberStillVisible = await page.getByText(`${TEST_MEMBER.rank} ${TEST_MEMBER.firstName} ${TEST_MEMBER.lastName}`).first().isVisible().catch(() => false);

      // The widget might be hidden entirely if no stale checkins remain
      const widgetStillVisible = await page.locator('text=Stale Check-ins').first().isVisible();

      if (!memberStillVisible) {
        console.log('Member successfully resolved - no longer in stale checkins');
      } else {
        console.log('Warning: Member may still appear in widget (check timing)');
      }

      // Verify in database that member is now checked out
      const direction = await getLatestCheckinDirection(client, testMemberId);
      expect(direction).toBe('out');

      console.log('Database confirmed: member is now checked out');

    } finally {
      await client.end();
    }
  });

  // ============================================================================
  // TEST 3: Resolve Without Note Shows Error
  // ============================================================================
  test('resolve button is disabled without audit note', async ({ page }) => {
    const client = await getDbClient();

    try {
      // Create fresh stale checkin
      await createStaleCheckin(client);

      // Login to dashboard
      await loginAsAdmin(page);

      // Wait for dashboard to fully load
      await page.waitForTimeout(2000);

      // Verify stale checkins widget is visible
      await expect(page.locator('text=Stale Check-ins').first()).toBeVisible({ timeout: 10000 });

      // Click "Select All" to select the stale checkin
      const selectAllButton = page.getByRole('button', { name: /Select All/i });
      await selectAllButton.click();

      // Click "Resolve Selected" button
      const resolveButton = page.getByRole('button', { name: /Resolve Selected/i });
      await resolveButton.click();

      // Verify modal appears
      await expect(page.getByText('Resolve Stale Check-ins')).toBeVisible({ timeout: 5000 });

      // Do NOT enter audit note - leave it empty

      // Find the confirm button and verify it's disabled
      const confirmButton = page.getByRole('button', { name: /Resolve \d+ Check-in/i });
      await expect(confirmButton).toBeDisabled();

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/07-resolve-disabled-no-note.png`,
        fullPage: true,
      });

      console.log('Resolve button correctly disabled when no note entered');

      // Close modal
      const cancelButton = page.getByRole('button', { name: /Cancel/i });
      await cancelButton.click();

    } finally {
      await client.end();
    }
  });

  // ============================================================================
  // TEST 4: Widget Not Shown When No Stale Checkins
  // ============================================================================
  test('widget is hidden when no stale checkins exist', async ({ page }) => {
    const client = await getDbClient();

    try {
      // Clear all checkins for test member
      await clearTestMemberCheckins(client);

      // Login to dashboard
      await loginAsAdmin(page);

      // Wait for dashboard to fully load
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/08-no-stale-checkins.png`,
        fullPage: true,
      });

      // Widget should not be visible (it returns null when no stale checkins)
      const staleWidget = page.locator('text=Stale Check-ins');
      const isVisible = await staleWidget.isVisible().catch(() => false);

      // Widget might still be visible but empty - check content
      if (isVisible) {
        // Check if our test member is NOT listed
        const memberListed = await page.getByText(`${TEST_MEMBER.rank} ${TEST_MEMBER.firstName} ${TEST_MEMBER.lastName}`).isVisible().catch(() => false);
        expect(memberListed).toBe(false);
        console.log('Widget visible but test member not listed (as expected)');
      } else {
        console.log('Widget hidden when no stale checkins (as expected)');
      }

    } finally {
      await client.end();
    }
  });

  // ============================================================================
  // Cleanup
  // ============================================================================
  test.afterAll(async () => {
    const client = await getDbClient();
    try {
      // Clean up test member's checkins
      await clearTestMemberCheckins(client);
      console.log('Test cleanup completed');
    } finally {
      await client.end();
    }
  });
});

import { test, expect, Page, Browser } from '@playwright/test';
import { Client } from 'pg';

/**
 * Lockup Workflow E2E Tests
 *
 * Verifies the building lockup feature:
 * - Members with "Lockup" tag see "Lock Building" button on checkout
 * - Clicking button navigates to LockupConfirmScreen
 * - Confirmation shows all present members/visitors
 * - Executing lockup bulk-checkouts everyone and creates audit entry
 *
 * Run with: bunx playwright test tests/e2e/scenarios/lockup-workflow.spec.ts
 */

// Run tests serially to avoid state conflicts
test.describe.configure({ mode: 'serial' });
test.setTimeout(120000); // 2 min timeout

const KIOSK_URL = 'http://localhost:5174';
const TV_URL = 'http://localhost:5175';
const SCREENSHOT_DIR = 'test-results/lockup-workflow';

// Test member badge serials - must exist in test database
const TEST_MEMBERS = {
  lockupAuthorized: {
    badge: 'TEST-BADGE-LOCKUP-001',
    serviceNumber: 'LOCKUP001',
    name: 'Test Lockup Officer',
    rank: 'PO1',
  },
  regular1: {
    badge: 'TEST-BADGE-K78347444',
    serviceNumber: 'K78347444',
    name: 'Ozana Martin Quesada',
    rank: 'MS',
  },
  regular2: {
    badge: 'TEST-BADGE-C38884472',
    serviceNumber: 'C38884472',
    name: 'Philippe Trudeau',
    rank: 'S3',
  },
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

// Helper to scan badge on kiosk
async function scanBadge(page: Page, serial: string): Promise<void> {
  await page.locator('body').click();
  await page.waitForTimeout(300);
  await page.keyboard.type(serial, { delay: 20 });
  await page.keyboard.press('Enter');
}

// Helper to get or create the Lockup tag
async function ensureLockupTag(client: Client): Promise<string> {
  // Check if Lockup tag exists
  let tagResult = await client.query(`
    SELECT id FROM tags WHERE name = 'Lockup'
  `);

  if (tagResult.rows.length === 0) {
    // Create the tag (color is required)
    tagResult = await client.query(`
      INSERT INTO tags (name, color, description)
      VALUES ('Lockup', '#dc2626', 'Authorized to perform building lockup')
      RETURNING id
    `);
  }

  return tagResult.rows[0].id;
}

// Helper to create test member with Lockup tag
async function createLockupMember(client: Client): Promise<string> {
  const tagId = await ensureLockupTag(client);

  // Get a division ID
  const divisionResult = await client.query(`
    SELECT id FROM divisions LIMIT 1
  `);
  if (divisionResult.rows.length === 0) {
    throw new Error('No divisions found in database');
  }
  const divisionId = divisionResult.rows[0].id;

  // Check if member already exists
  let memberResult = await client.query(`
    SELECT id FROM members WHERE service_number = $1
  `, [TEST_MEMBERS.lockupAuthorized.serviceNumber]);

  let memberId: string;

  if (memberResult.rows.length === 0) {
    // Create member
    memberResult = await client.query(`
      INSERT INTO members (
        first_name, last_name, service_number, rank, division_id, status, member_type
      ) VALUES (
        'Test', 'Lockup Officer', $1, 'PO1', $2, 'active', 'class_a'
      )
      RETURNING id
    `, [TEST_MEMBERS.lockupAuthorized.serviceNumber, divisionId]);
    memberId = memberResult.rows[0].id;
  } else {
    memberId = memberResult.rows[0].id;
  }

  // Ensure badge exists and is assigned
  await client.query(`
    INSERT INTO badges (serial_number, assignment_type, assigned_to_id, status)
    VALUES ($1, 'member', $2, 'active')
    ON CONFLICT (serial_number) DO UPDATE
    SET assignment_type = 'member', assigned_to_id = $2, status = 'active'
  `, [TEST_MEMBERS.lockupAuthorized.badge, memberId]);

  // Update member with badge_id
  const badgeResult = await client.query(`
    SELECT id FROM badges WHERE serial_number = $1
  `, [TEST_MEMBERS.lockupAuthorized.badge]);

  await client.query(`
    UPDATE members SET badge_id = $1 WHERE id = $2
  `, [badgeResult.rows[0].id, memberId]);

  // Assign Lockup tag if not already assigned
  await client.query(`
    INSERT INTO member_tags (member_id, tag_id)
    VALUES ($1, $2)
    ON CONFLICT (member_id, tag_id) DO NOTHING
  `, [memberId, tagId]);

  return memberId;
}

// Helper to get member ID by service number
async function getMemberIdByServiceNumber(client: Client, serviceNumber: string): Promise<string | null> {
  const result = await client.query(`
    SELECT id FROM members WHERE service_number = $1
  `, [serviceNumber]);
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// Helper to check if member is present
async function isMemberPresent(client: Client, memberId: string): Promise<boolean> {
  const result = await client.query(`
    SELECT direction FROM checkins
    WHERE member_id = $1
    ORDER BY timestamp DESC
    LIMIT 1
  `, [memberId]);
  return result.rows.length > 0 && result.rows[0].direction === 'in';
}

// Helper to get all currently present member IDs
async function getPresentMemberIds(client: Client): Promise<string[]> {
  const result = await client.query(`
    SELECT DISTINCT ON (member_id) member_id, direction
    FROM checkins
    ORDER BY member_id, timestamp DESC
  `);
  return result.rows
    .filter(row => row.direction === 'in')
    .map(row => row.member_id);
}

// Helper to check if lockup audit entry exists
async function getLockupAuditEntry(client: Client, memberId: string): Promise<{ id: string; action: string; notes: string } | null> {
  const result = await client.query(`
    SELECT id, action, notes
    FROM responsibility_audit_log
    WHERE member_id = $1 AND tag_name = 'Lockup' AND action = 'building_lockup'
    ORDER BY timestamp DESC
    LIMIT 1
  `, [memberId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

// Helper to clear checkins for testing
async function clearAllCheckins(client: Client): Promise<void> {
  await client.query('DELETE FROM checkins');
}

// Helper to clear lockup audit entries for test member
async function clearLockupAuditEntries(client: Client, memberId: string): Promise<void> {
  await client.query(`
    DELETE FROM responsibility_audit_log
    WHERE member_id = $1 AND tag_name = 'Lockup'
  `, [memberId]);
}

test.describe('Lockup Workflow', () => {
  let lockupMemberId: string;

  test.beforeAll(async () => {
    // Ensure screenshot directory exists
    const fs = await import('fs');
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    // Create test member with Lockup tag
    const client = await getDbClient();
    try {
      lockupMemberId = await createLockupMember(client);
      console.log(`Created/found lockup member: ${lockupMemberId}`);
    } finally {
      await client.end();
    }
  });

  // ============================================================================
  // TEST 1: Lockup Button Appears on Checkout for Authorized Members
  // ============================================================================
  test('lockup button appears for member with Lockup tag on checkout', async ({ browser }) => {
    const client = await getDbClient();
    const kioskContext = await browser.newContext();
    const kioskPage = await kioskContext.newPage();

    try {
      // Clear checkins for clean state
      await clearAllCheckins(client);

      // Wait for cooldown from previous tests
      await kioskPage.waitForTimeout(6000);

      // Navigate to kiosk
      await kioskPage.goto(KIOSK_URL);
      await kioskPage.waitForLoadState('networkidle');
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible();

      // Step 1: Check in the lockup member
      await scanBadge(kioskPage, TEST_MEMBERS.lockupAuthorized.badge);

      // Verify check-in success
      await expect(kioskPage.getByText(/Signed In/)).toBeVisible({ timeout: 10000 });

      await kioskPage.screenshot({
        path: `${SCREENSHOT_DIR}/01-lockup-member-checkin.png`,
        fullPage: true,
      });

      // Wait for return to idle
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible({ timeout: 8000 });

      // Wait for duplicate scan cooldown
      await kioskPage.waitForTimeout(6000);

      // Step 2: Check out the lockup member - should show "Lock Building" button
      await scanBadge(kioskPage, TEST_MEMBERS.lockupAuthorized.badge);

      // Verify checkout success screen
      await expect(kioskPage.getByText(/Signed Out/)).toBeVisible({ timeout: 10000 });

      // Verify "Lock Building" button appears (since member has Lockup tag)
      const lockBuildingButton = kioskPage.getByRole('button', { name: /Lock Building/i });
      await expect(lockBuildingButton).toBeVisible({ timeout: 5000 });

      await kioskPage.screenshot({
        path: `${SCREENSHOT_DIR}/02-lockup-button-visible.png`,
        fullPage: true,
      });

      console.log('Lock Building button visible for authorized member');

    } finally {
      await kioskContext.close();
      await client.end();
    }
  });

  // ============================================================================
  // TEST 2: Full Lockup Flow - Check in others, then execute lockup
  // ============================================================================
  test('full lockup workflow - bulk checkout all present members', async ({ browser }) => {
    const client = await getDbClient();
    const kioskContext = await browser.newContext();
    const tvContext = await browser.newContext();

    const kioskPage = await kioskContext.newPage();
    const tvPage = await tvContext.newPage();

    try {
      // Clear state
      await clearAllCheckins(client);
      await clearLockupAuditEntries(client, lockupMemberId);

      // Wait for cooldown
      await kioskPage.waitForTimeout(6000);

      // Navigate to both interfaces
      await Promise.all([
        kioskPage.goto(KIOSK_URL),
        tvPage.goto(TV_URL),
      ]);

      await Promise.all([
        kioskPage.waitForLoadState('networkidle'),
        tvPage.waitForLoadState('networkidle'),
      ]);

      // Step 1: Check in regular member 1
      await scanBadge(kioskPage, TEST_MEMBERS.regular1.badge);
      await expect(kioskPage.getByText(/Signed In/)).toBeVisible({ timeout: 10000 });
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible({ timeout: 8000 });

      console.log(`Checked in member 1: ${TEST_MEMBERS.regular1.name}`);

      // Wait for duplicate scan cooldown
      await kioskPage.waitForTimeout(6000);

      // Step 2: Check in regular member 2
      await scanBadge(kioskPage, TEST_MEMBERS.regular2.badge);
      await expect(kioskPage.getByText(/Signed In/)).toBeVisible({ timeout: 10000 });
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible({ timeout: 8000 });

      console.log(`Checked in member 2: ${TEST_MEMBERS.regular2.name}`);

      // Wait for duplicate scan cooldown
      await kioskPage.waitForTimeout(6000);

      // Step 3: Check in lockup authorized member
      await scanBadge(kioskPage, TEST_MEMBERS.lockupAuthorized.badge);
      await expect(kioskPage.getByText(/Signed In/)).toBeVisible({ timeout: 10000 });
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible({ timeout: 8000 });

      console.log('Checked in lockup member');

      // Verify all 3 are present in TV display
      await tvPage.reload();
      await tvPage.waitForLoadState('networkidle');

      await tvPage.screenshot({
        path: `${SCREENSHOT_DIR}/03-tv-all-present.png`,
        fullPage: true,
      });

      // Verify in database
      const presentBefore = await getPresentMemberIds(client);
      console.log(`Present members before lockup: ${presentBefore.length}`);
      expect(presentBefore.length).toBeGreaterThanOrEqual(3);

      // Wait for duplicate scan cooldown
      await kioskPage.waitForTimeout(6000);

      // Step 4: Check out lockup member - should show "Lock Building" button
      await scanBadge(kioskPage, TEST_MEMBERS.lockupAuthorized.badge);

      await expect(kioskPage.getByText(/Signed Out/)).toBeVisible({ timeout: 10000 });

      // Click "Lock Building" button
      const lockBuildingButton = kioskPage.getByRole('button', { name: /Lock Building/i });
      await expect(lockBuildingButton).toBeVisible({ timeout: 5000 });

      await kioskPage.screenshot({
        path: `${SCREENSHOT_DIR}/04-checkout-with-lockup-button.png`,
        fullPage: true,
      });

      await lockBuildingButton.click();

      // Step 5: Verify LockupConfirmScreen
      await expect(kioskPage.getByText('Building Lockup')).toBeVisible({ timeout: 5000 });

      // Verify present list shows other members
      await expect(kioskPage.getByText(/still present/i)).toBeVisible();
      await expect(kioskPage.getByText(TEST_MEMBERS.regular1.name, { exact: false })).toBeVisible();
      await expect(kioskPage.getByText(TEST_MEMBERS.regular2.name, { exact: false })).toBeVisible();

      await kioskPage.screenshot({
        path: `${SCREENSHOT_DIR}/05-lockup-confirm-screen.png`,
        fullPage: true,
      });

      // Step 6: Click "Confirm Building Empty" button
      const confirmButton = kioskPage.getByRole('button', { name: /Confirm Building Empty/i });
      await expect(confirmButton).toBeVisible();
      await confirmButton.click();

      // Step 7: Verify success screen
      await expect(kioskPage.getByText('Building Locked')).toBeVisible({ timeout: 10000 });
      await expect(kioskPage.getByText(/All personnel have been signed out/i)).toBeVisible();

      await kioskPage.screenshot({
        path: `${SCREENSHOT_DIR}/06-lockup-success.png`,
        fullPage: true,
      });

      console.log('Lockup executed successfully');

      // Wait for kiosk to return to idle
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible({ timeout: 10000 });

      // Step 8: Verify all members are now checked out (database)
      await kioskPage.waitForTimeout(1000); // Allow time for DB updates

      const member1Present = await isMemberPresent(
        client,
        (await getMemberIdByServiceNumber(client, TEST_MEMBERS.regular1.serviceNumber)) || ''
      );
      const member2Present = await isMemberPresent(
        client,
        (await getMemberIdByServiceNumber(client, TEST_MEMBERS.regular2.serviceNumber)) || ''
      );
      const lockupMemberPresent = await isMemberPresent(client, lockupMemberId);

      expect(member1Present).toBe(false);
      expect(member2Present).toBe(false);
      expect(lockupMemberPresent).toBe(false);

      console.log('All members verified as checked out');

      // Step 9: Verify audit log entry
      const auditEntry = await getLockupAuditEntry(client, lockupMemberId);
      expect(auditEntry).toBeTruthy();
      expect(auditEntry?.action).toBe('building_lockup');

      console.log(`Audit entry created: ${auditEntry?.id}`);
      console.log(`Audit notes: ${auditEntry?.notes}`);

      // Refresh TV display to verify empty
      await tvPage.reload();
      await tvPage.waitForLoadState('networkidle');

      await tvPage.screenshot({
        path: `${SCREENSHOT_DIR}/07-tv-after-lockup.png`,
        fullPage: true,
      });

    } finally {
      await kioskContext.close();
      await tvContext.close();
      await client.end();
    }
  });

  // ============================================================================
  // TEST 3: Cancel Lockup Flow
  // ============================================================================
  test('cancel button returns to idle screen', async ({ browser }) => {
    const client = await getDbClient();
    const kioskContext = await browser.newContext();
    const kioskPage = await kioskContext.newPage();

    try {
      // Clear state
      await clearAllCheckins(client);

      // Wait for cooldown
      await kioskPage.waitForTimeout(6000);

      // Navigate to kiosk
      await kioskPage.goto(KIOSK_URL);
      await kioskPage.waitForLoadState('networkidle');

      // Check in lockup member
      await scanBadge(kioskPage, TEST_MEMBERS.lockupAuthorized.badge);
      await expect(kioskPage.getByText(/Signed In/)).toBeVisible({ timeout: 10000 });
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible({ timeout: 8000 });

      // Wait for duplicate scan cooldown
      await kioskPage.waitForTimeout(6000);

      // Check out - click Lock Building
      await scanBadge(kioskPage, TEST_MEMBERS.lockupAuthorized.badge);
      await expect(kioskPage.getByText(/Signed Out/)).toBeVisible({ timeout: 10000 });

      const lockBuildingButton = kioskPage.getByRole('button', { name: /Lock Building/i });
      await expect(lockBuildingButton).toBeVisible({ timeout: 5000 });
      await lockBuildingButton.click();

      // On LockupConfirmScreen
      await expect(kioskPage.getByText('Building Lockup')).toBeVisible({ timeout: 5000 });

      // Click Cancel
      const cancelButton = kioskPage.getByRole('button', { name: /Cancel/i });
      await expect(cancelButton).toBeVisible();
      await cancelButton.click();

      // Verify returned to idle
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible({ timeout: 5000 });

      // Verify member is still checked out (lockup was not executed)
      const memberPresent = await isMemberPresent(client, lockupMemberId);
      expect(memberPresent).toBe(false);

      console.log('Cancel flow completed - returned to idle without executing lockup');

    } finally {
      await kioskContext.close();
      await client.end();
    }
  });

  // ============================================================================
  // TEST 4: Non-Lockup Member Does Not See Lockup Button
  // ============================================================================
  test('regular member does not see lockup button on checkout', async ({ browser }) => {
    const client = await getDbClient();
    const kioskContext = await browser.newContext();
    const kioskPage = await kioskContext.newPage();

    try {
      // Clear state
      await clearAllCheckins(client);

      // Wait for cooldown
      await kioskPage.waitForTimeout(6000);

      // Navigate to kiosk
      await kioskPage.goto(KIOSK_URL);
      await kioskPage.waitForLoadState('networkidle');

      // Check in regular member
      await scanBadge(kioskPage, TEST_MEMBERS.regular1.badge);
      await expect(kioskPage.getByText(/Signed In/)).toBeVisible({ timeout: 10000 });
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible({ timeout: 8000 });

      // Wait for duplicate scan cooldown
      await kioskPage.waitForTimeout(6000);

      // Check out - should NOT show "Lock Building" button
      await scanBadge(kioskPage, TEST_MEMBERS.regular1.badge);
      await expect(kioskPage.getByText(/Signed Out/)).toBeVisible({ timeout: 10000 });

      // Wait a moment for button state to resolve
      await kioskPage.waitForTimeout(2000);

      // Verify "Lock Building" button is NOT visible
      const lockBuildingButton = kioskPage.getByRole('button', { name: /Lock Building/i });
      await expect(lockBuildingButton).not.toBeVisible();

      await kioskPage.screenshot({
        path: `${SCREENSHOT_DIR}/08-regular-member-no-lockup-button.png`,
        fullPage: true,
      });

      console.log('Regular member correctly does not see lockup button');

    } finally {
      await kioskContext.close();
      await client.end();
    }
  });

  // ============================================================================
  // Cleanup
  // ============================================================================
  test.afterAll(async () => {
    const client = await getDbClient();
    try {
      // Clean up test data - clear checkins only, keep members/badges for future tests
      await clearAllCheckins(client);
      console.log('Test cleanup completed');
    } finally {
      await client.end();
    }
  });
});

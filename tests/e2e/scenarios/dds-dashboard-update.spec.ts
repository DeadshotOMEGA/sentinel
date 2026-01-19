import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { Client } from 'pg';

/**
 * DDS Dashboard Update E2E Test
 *
 * Reproduces the bug report where the dashboard shows "No DDS assigned for today"
 * even after a member self-accepts DDS from the kiosk.
 *
 * The fix relies on WebSocket broadcasting the dds_update event to connected
 * dashboard clients so they update immediately without needing a page refresh.
 *
 * Run with: bunx playwright test tests/e2e/scenarios/dds-dashboard-update.spec.ts
 */

test.describe.configure({ mode: 'serial' });
test.setTimeout(90000);

const API_BASE_URL = 'http://localhost:3000';
const DASHBOARD_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'test-results/dds-dashboard-update';

// Admin credentials from seed
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'PvlvoQg/uCV2xfqE6ZTyFg';

// Kiosk API key (must match backend/.env)
const KIOSK_API_KEY = 'g4THbjZ5Hcbb87Xy2+MFJ93F2ank69j3ScaO3qsSaRQ';

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

// Helper to clear DDS assignments for today
async function clearTodaysDds(client: Client): Promise<void> {
  await client.query(`
    DELETE FROM dds_assignments
    WHERE assigned_date = CURRENT_DATE
  `);
}

// Helper to get a test member with badge (prefer Pierre-Luc Belleau if available)
async function getTestMemberWithBadge(client: Client): Promise<{
  memberId: string;
  badgeSerial: string;
  memberName: string;
  firstName: string;
  lastName: string;
  rank: string;
}> {
  // First try to find Pierre-Luc Belleau specifically
  let result = await client.query(`
    SELECT m.id as member_id, b.serial_number as badge_serial, m.first_name, m.last_name, m.rank
    FROM members m
    JOIN badges b ON b.assigned_to_id = m.id
    WHERE m.status = 'active'
      AND b.status = 'active'
      AND b.assignment_type = 'member'
      AND m.first_name ILIKE 'Pierre%'
      AND m.last_name ILIKE 'Belleau%'
    LIMIT 1
  `);

  // Fall back to any active member with badge
  if (result.rows.length === 0) {
    result = await client.query(`
      SELECT m.id as member_id, b.serial_number as badge_serial, m.first_name, m.last_name, m.rank
      FROM members m
      JOIN badges b ON b.assigned_to_id = m.id
      WHERE m.status = 'active'
        AND b.status = 'active'
        AND b.assignment_type = 'member'
      LIMIT 1
    `);
  }

  if (result.rows.length === 0) {
    throw new Error('No active member with active badge found');
  }

  const row = result.rows[0];
  return {
    memberId: row.member_id,
    badgeSerial: row.badge_serial,
    firstName: row.first_name,
    lastName: row.last_name,
    rank: row.rank,
    memberName: `${row.rank} ${row.first_name} ${row.last_name}`,
  };
}

// Helper to clean up orphaned checkin records (those missing badgeId)
async function cleanupOrphanedCheckins(client: Client): Promise<void> {
  await client.query(`
    DELETE FROM checkins
    WHERE badge_id IS NULL
  `);
}

// Helper to check out member if currently checked in
async function ensureMemberCheckedOut(client: Client, memberId: string): Promise<void> {
  // First clean up any orphaned records that would break queries
  await cleanupOrphanedCheckins(client);

  const result = await client.query(`
    SELECT c.direction, c.badge_id
    FROM checkins c
    WHERE c.member_id = $1
    ORDER BY c.timestamp DESC
    LIMIT 1
  `, [memberId]);

  if (result.rows.length > 0 && result.rows[0].direction === 'in') {
    // Use the same badge_id as the checkin to keep data consistent
    const badgeId = result.rows[0].badge_id;
    await client.query(`
      INSERT INTO checkins (member_id, badge_id, direction, kiosk_id, method)
      VALUES ($1, $2, 'out', 'e2e-test', 'admin_manual')
    `, [memberId, badgeId]);
  }
}

// Helper to check in member via API (simulates badge scan)
async function checkinMemberViaApi(request: APIRequestContext, badgeSerial: string): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/api/checkins`, {
    headers: {
      'X-Kiosk-API-Key': KIOSK_API_KEY,
      'Content-Type': 'application/json',
    },
    data: {
      serialNumber: badgeSerial,
      kioskId: 'e2e-test-kiosk',
      timestamp: new Date().toISOString(),
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Check-in failed: ${response.status()} - ${body}`);
  }
}

// Helper to accept DDS via API
async function acceptDdsViaApi(request: APIRequestContext, memberId: string): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/api/dds/accept`, {
    headers: {
      'X-Kiosk-API-Key': KIOSK_API_KEY,
      'Content-Type': 'application/json',
    },
    data: {
      memberId,
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`DDS accept failed: ${response.status()} - ${body}`);
  }
}

// Helper to login to dashboard
async function loginToDashboard(page: Page): Promise<void> {
  await page.goto(DASHBOARD_URL);
  await page.waitForLoadState('domcontentloaded');

  // Check if already logged in (dashboard content visible)
  const dashboardContent = page.locator('text=Dashboard');
  if (await dashboardContent.isVisible({ timeout: 2000 }).catch(() => false)) {
    return; // Already logged in
  }

  // Check if login form is visible
  const loginForm = page.locator('input[type="password"]');
  if (!(await loginForm.isVisible({ timeout: 5000 }).catch(() => false))) {
    // Maybe already logged in, check for dashboard
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    return;
  }

  // Fill login form
  await page.fill('input[name="username"], input[placeholder*="Username"], input:not([type="password"]):first-of-type', ADMIN_USERNAME);
  await page.fill('input[name="password"], input[type="password"]', ADMIN_PASSWORD);
  await page.click('button:has-text("Sign In")');

  // Wait for dashboard to load
  await page.waitForSelector('text=Dashboard', { timeout: 15000 });
}

test.describe('DDS Dashboard Update via WebSocket', () => {
  test.beforeAll(async () => {
    const fs = await import('fs');
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  // ============================================================================
  // TEST: Dashboard updates immediately when DDS is self-accepted
  // ============================================================================
  test('dashboard reflects DDS assignment via WebSocket without page refresh', async ({ browser, request }) => {
    const client = await getDbClient();

    try {
      // Step 1: Clear any existing DDS assignments for today
      console.log('Step 1: Clearing today\'s DDS assignments...');
      await clearTodaysDds(client);

      // Get test member
      const testMember = await getTestMemberWithBadge(client);
      console.log(`Using test member: ${testMember.memberName}`);

      // Ensure member is checked out
      await ensureMemberCheckedOut(client, testMember.memberId);

      // Step 2: Open dashboard and verify "No DDS" state
      console.log('Step 2: Opening dashboard and verifying "No DDS" state...');
      const dashboardContext = await browser.newContext();
      const dashboardPage = await dashboardContext.newPage();

      await loginToDashboard(dashboardPage);
      // Wait for page to stabilize (don't use networkidle due to WebSocket)
      await dashboardPage.waitForTimeout(2000);

      // Wait for DDS panel to load and verify "No DDS assigned for today"
      const noDdsMessage = dashboardPage.locator('text=No DDS assigned for today');
      await expect(noDdsMessage).toBeVisible({ timeout: 10000 });

      // Screenshot: Dashboard showing "No DDS assigned"
      await dashboardPage.screenshot({
        path: `${SCREENSHOT_DIR}/01-dashboard-no-dds.png`,
        fullPage: true,
      });
      console.log('Verified: Dashboard shows "No DDS assigned for today"');

      // Step 3: Check in member via API (simulates badge scan at kiosk)
      console.log('Step 3: Checking in member via API...');
      await checkinMemberViaApi(request, testMember.badgeSerial);
      console.log('Member checked in successfully');

      // Brief pause to ensure check-in is processed
      await dashboardPage.waitForTimeout(500);

      // Step 4: Accept DDS via API (simulates clicking "I am DDS today" button)
      console.log('Step 4: Accepting DDS via API...');
      await acceptDdsViaApi(request, testMember.memberId);
      console.log('DDS accepted successfully');

      // Step 5: Verify dashboard updates via WebSocket (without refresh)
      console.log('Step 5: Verifying dashboard updates via WebSocket...');

      // Wait for the DDS panel to update via WebSocket
      // The DDS assignment should appear showing the member's name
      const memberNameInPanel = dashboardPage.locator(`text=${testMember.firstName}`).or(
        dashboardPage.locator(`text=${testMember.lastName}`)
      );
      await expect(memberNameInPanel.first()).toBeVisible({ timeout: 10000 });

      // Verify "No DDS assigned" message is no longer visible
      await expect(noDdsMessage).not.toBeVisible({ timeout: 5000 });

      // Screenshot: Dashboard showing DDS assignment
      await dashboardPage.screenshot({
        path: `${SCREENSHOT_DIR}/02-dashboard-dds-assigned.png`,
        fullPage: true,
      });
      console.log('SUCCESS: Dashboard updated via WebSocket to show DDS assignment');

      // Step 6: Verify the DDS panel shows correct member info
      console.log('Step 6: Verifying DDS panel shows correct member information...');

      // Check for the DDS chip with success styling
      const ddsChip = dashboardPage.locator('.bg-success-50, [class*="success"]').first();
      await expect(ddsChip).toBeVisible();

      // Verify "Self-accepted" text is shown (indicates the method of assignment)
      const selfAcceptedText = dashboardPage.locator('text=/Self-accepted/i');
      await expect(selfAcceptedText).toBeVisible({ timeout: 5000 });

      console.log('Verified: DDS panel shows member with "Self-accepted" indicator');

      // Step 7: Verify database state matches UI
      console.log('Step 7: Verifying database state...');
      const dbResult = await client.query(`
        SELECT id, member_id, status, accepted_at
        FROM dds_assignments
        WHERE assigned_date = CURRENT_DATE
          AND member_id = $1
          AND status = 'active'
      `, [testMember.memberId]);

      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].accepted_at).toBeTruthy();
      console.log('Verified: Database has active DDS assignment with accepted_at timestamp');

      // Cleanup context
      await dashboardContext.close();

    } finally {
      // Cleanup
      await clearTodaysDds(client);
      await client.end();
    }
  });

  // ============================================================================
  // TEST: Dashboard shows DDS member info correctly after assignment
  // ============================================================================
  test('dashboard DDS panel shows correct member information after assignment', async ({ browser, request }) => {
    const client = await getDbClient();

    try {
      // Clear DDS and set up test
      await clearTodaysDds(client);
      const testMember = await getTestMemberWithBadge(client);
      await ensureMemberCheckedOut(client, testMember.memberId);

      // Open dashboard first
      const dashboardContext = await browser.newContext();
      const dashboardPage = await dashboardContext.newPage();
      await loginToDashboard(dashboardPage);
      await dashboardPage.waitForTimeout(2000);

      // Verify no DDS initially
      await expect(dashboardPage.locator('text=No DDS assigned for today')).toBeVisible({ timeout: 10000 });

      // Check in member and accept DDS via API
      await checkinMemberViaApi(request, testMember.badgeSerial);
      await acceptDdsViaApi(request, testMember.memberId);

      // Wait for dashboard to update via WebSocket
      await dashboardPage.waitForTimeout(2000);

      // Verify member appears in DDS panel
      const memberFirstName = dashboardPage.locator(`text=${testMember.firstName}`).first();
      await expect(memberFirstName).toBeVisible({ timeout: 10000 });

      // Verify the member is also visible in the present people list
      // (they should have been checked in)
      const memberCard = dashboardPage.locator(`text=${testMember.lastName}`).first();
      await expect(memberCard).toBeVisible({ timeout: 10000 });

      // Screenshot showing member with DDS status
      await dashboardPage.screenshot({
        path: `${SCREENSHOT_DIR}/03-member-with-dds-in-panel.png`,
        fullPage: true,
      });

      console.log('SUCCESS: Member visible in dashboard with DDS assignment reflected');

      await dashboardContext.close();

    } finally {
      await clearTodaysDds(client);
      await client.end();
    }
  });

  // ============================================================================
  // Cleanup
  // ============================================================================
  test.afterAll(async () => {
    const client = await getDbClient();
    try {
      await clearTodaysDds(client);
      console.log('Cleaned up test DDS data');
    } finally {
      await client.end();
    }
  });
});

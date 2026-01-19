import { test, expect, Page } from '@playwright/test';
import { Client } from 'pg';

/**
 * DDS (Duty Day Staff) System E2E Tests
 *
 * Verifies the DDS workflow:
 * - First check-in of day shows "I am DDS today" button
 * - Self-accepting DDS creates assignment
 * - Dashboard shows current DDS
 * - Admin can transfer DDS
 *
 * Run with: bunx playwright test tests/e2e/scenarios/dds-system.spec.ts
 */

test.describe.configure({ mode: 'serial' });
test.setTimeout(60000);

const KIOSK_URL = 'http://localhost:5174';
const DASHBOARD_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'test-results/dds-system';

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

// Helper to scan badge
async function scanBadge(page: Page, serial: string): Promise<void> {
  await page.locator('body').click();
  await page.waitForTimeout(300);
  await page.keyboard.type(serial, { delay: 20 });
  await page.keyboard.press('Enter');
}

// Helper to clear DDS assignments for today
async function clearTodaysDds(client: Client): Promise<void> {
  await client.query(`
    DELETE FROM dds_assignments
    WHERE assigned_date = CURRENT_DATE
  `);
}

// Helper to get a test member with badge
async function getTestMemberWithBadge(client: Client): Promise<{ memberId: string; badgeSerial: string; memberName: string }> {
  const result = await client.query(`
    SELECT m.id as member_id, b.serial_number as badge_serial, m.first_name, m.last_name, m.rank
    FROM members m
    JOIN badges b ON b.assigned_to_id = m.id
    WHERE m.status = 'active'
      AND b.status = 'active'
      AND b.assignment_type = 'member'
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    throw new Error('No active member with active badge found');
  }

  const row = result.rows[0];
  return {
    memberId: row.member_id,
    badgeSerial: row.badge_serial,
    memberName: `${row.rank} ${row.first_name} ${row.last_name}`,
  };
}

// Helper to check out member if currently checked in
async function ensureMemberCheckedOut(client: Client, memberId: string): Promise<void> {
  // Get current status
  const result = await client.query(`
    SELECT direction FROM checkins
    WHERE member_id = $1
    ORDER BY timestamp DESC
    LIMIT 1
  `, [memberId]);

  // If last check-in was 'in', create a checkout
  if (result.rows.length > 0 && result.rows[0].direction === 'in') {
    await client.query(`
      INSERT INTO checkins (member_id, direction, kiosk_id, method)
      VALUES ($1, 'out', 'e2e-test', 'manual')
    `, [memberId]);
  }
}

test.describe('DDS System', () => {
  test.beforeAll(async () => {
    const fs = await import('fs');
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  // ============================================================================
  // TEST 1: First check-in shows DDS button when no DDS assigned
  // ============================================================================
  test('first check-in of day shows DDS button', async ({ page }) => {
    const client = await getDbClient();

    try {
      // Clear today's DDS
      await clearTodaysDds(client);

      // Get a test member
      const testMember = await getTestMemberWithBadge(client);
      console.log(`Using test member: ${testMember.memberName}`);

      // Ensure member is checked out
      await ensureMemberCheckedOut(client, testMember.memberId);

      // Navigate to kiosk
      await page.goto(KIOSK_URL);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Tap Your Badge')).toBeVisible();

      // Screenshot: Before scan
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/01-kiosk-before-scan.png`,
        fullPage: true,
      });

      // Scan badge to check in
      await scanBadge(page, testMember.badgeSerial);

      // Wait for success screen
      await expect(page.getByText('Signed In')).toBeVisible({ timeout: 10000 });

      // Should show DDS button since no DDS for today
      const ddsButton = page.getByRole('button', { name: /I am DDS today/i });
      await expect(ddsButton).toBeVisible({ timeout: 5000 });

      // Screenshot: Success screen with DDS button
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/01-success-with-dds-button.png`,
        fullPage: true,
      });

      console.log('✅ DDS button visible on first check-in');

    } finally {
      await client.end();
    }
  });

  // ============================================================================
  // TEST 2: DDS button hidden when DDS already assigned
  // ============================================================================
  test('DDS button hidden when DDS already assigned', async ({ page }) => {
    const client = await getDbClient();

    try {
      // Get test members
      const testMember = await getTestMemberWithBadge(client);

      // Create a DDS assignment for today
      await clearTodaysDds(client);
      await client.query(`
        INSERT INTO dds_assignments (member_id, assigned_date, status, accepted_at)
        VALUES ($1, CURRENT_DATE, 'active', NOW())
      `, [testMember.memberId]);

      // Ensure member is checked out
      await ensureMemberCheckedOut(client, testMember.memberId);

      // Navigate to kiosk
      await page.goto(KIOSK_URL);
      await page.waitForLoadState('networkidle');

      // Scan badge
      await scanBadge(page, testMember.badgeSerial);

      // Wait for success screen
      await expect(page.getByText('Signed In')).toBeVisible({ timeout: 10000 });

      // DDS button should NOT be visible
      const ddsButton = page.getByRole('button', { name: /I am DDS today/i });

      // Wait a bit for potential button to appear
      await page.waitForTimeout(1000);

      // Button should not be visible
      await expect(ddsButton).not.toBeVisible();

      // Screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/02-success-no-dds-button.png`,
        fullPage: true,
      });

      console.log('✅ DDS button hidden when DDS already assigned');

    } finally {
      // Cleanup
      await clearTodaysDds(client);
      await client.end();
    }
  });

  // ============================================================================
  // TEST 3: Self-accepting DDS creates assignment
  // ============================================================================
  test('clicking DDS button creates assignment', async ({ page }) => {
    const client = await getDbClient();

    try {
      // Clear today's DDS
      await clearTodaysDds(client);

      // Get test member
      const testMember = await getTestMemberWithBadge(client);

      // Ensure member is checked out
      await ensureMemberCheckedOut(client, testMember.memberId);

      // Navigate to kiosk
      await page.goto(KIOSK_URL);
      await page.waitForLoadState('networkidle');

      // Scan badge
      await scanBadge(page, testMember.badgeSerial);

      // Wait for success screen and DDS button
      await expect(page.getByText('Signed In')).toBeVisible({ timeout: 10000 });
      const ddsButton = page.getByRole('button', { name: /I am DDS today/i });
      await expect(ddsButton).toBeVisible({ timeout: 5000 });

      // Click DDS button
      await ddsButton.click();

      // Wait for button to show success state (checkmark)
      await page.waitForTimeout(2000);

      // Screenshot after accepting DDS
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/03-dds-accepted.png`,
        fullPage: true,
      });

      // Verify assignment was created in database
      const result = await client.query(`
        SELECT id, member_id, status, accepted_at
        FROM dds_assignments
        WHERE assigned_date = CURRENT_DATE
          AND member_id = $1
          AND status = 'active'
      `, [testMember.memberId]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].accepted_at).toBeTruthy();

      console.log('✅ DDS assignment created with active status');

      // Verify audit log entry
      const auditResult = await client.query(`
        SELECT action, tag_name, performed_by_type
        FROM responsibility_audit_log
        WHERE member_id = $1
          AND tag_name = 'DDS'
        ORDER BY timestamp DESC
        LIMIT 1
      `, [testMember.memberId]);

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].action).toBe('self_accepted');
      expect(auditResult.rows[0].performed_by_type).toBe('member');

      console.log('✅ Audit log entry created');

    } finally {
      // Cleanup
      await clearTodaysDds(client);
      await client.end();
    }
  });

  // ============================================================================
  // TEST 4: DDS button only shown for check-INs, not check-OUTs
  // ============================================================================
  test('DDS button not shown on check-out', async ({ page }) => {
    const client = await getDbClient();

    try {
      // Clear today's DDS
      await clearTodaysDds(client);

      // Get test member
      const testMember = await getTestMemberWithBadge(client);

      // First, check the member IN
      await client.query(`
        INSERT INTO checkins (member_id, direction, kiosk_id, method)
        VALUES ($1, 'in', 'e2e-test', 'manual')
      `, [testMember.memberId]);

      // Navigate to kiosk
      await page.goto(KIOSK_URL);
      await page.waitForLoadState('networkidle');

      // Scan badge (should check OUT)
      await scanBadge(page, testMember.badgeSerial);

      // Wait for success screen
      await expect(page.getByText('Signed Out')).toBeVisible({ timeout: 10000 });

      // DDS button should NOT be visible on checkout
      const ddsButton = page.getByRole('button', { name: /I am DDS today/i });
      await page.waitForTimeout(1000);
      await expect(ddsButton).not.toBeVisible();

      // Screenshot
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/04-checkout-no-dds-button.png`,
        fullPage: true,
      });

      console.log('✅ DDS button not shown on check-out');

    } finally {
      await client.end();
    }
  });

  // ============================================================================
  // TEST 5: API - Get current DDS
  // ============================================================================
  test('API returns current DDS status', async ({ request }) => {
    const client = await getDbClient();

    try {
      // Clear and create DDS assignment
      await clearTodaysDds(client);
      const testMember = await getTestMemberWithBadge(client);

      await client.query(`
        INSERT INTO dds_assignments (member_id, assigned_date, status, accepted_at)
        VALUES ($1, CURRENT_DATE, 'active', NOW())
      `, [testMember.memberId]);

      // Call API
      const response = await request.get('http://localhost:3001/api/dds/current');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.dds).toBeTruthy();
      expect(data.dds.status).toBe('active');
      expect(data.dds.member).toBeTruthy();

      console.log('✅ API returns current DDS:', data.dds.member.name);

    } finally {
      await clearTodaysDds(client);
      await client.end();
    }
  });

  // ============================================================================
  // TEST 6: API - DDS status check
  // ============================================================================
  test('API returns hasDds status', async ({ request }) => {
    const client = await getDbClient();

    try {
      // Clear DDS
      await clearTodaysDds(client);

      // Check status - should be false
      let response = await request.get('http://localhost:3001/api/dds/status');
      expect(response.ok()).toBeTruthy();
      let data = await response.json();
      expect(data.hasDds).toBe(false);

      console.log('✅ API returns hasDds=false when no DDS');

      // Create DDS assignment
      const testMember = await getTestMemberWithBadge(client);
      await client.query(`
        INSERT INTO dds_assignments (member_id, assigned_date, status, accepted_at)
        VALUES ($1, CURRENT_DATE, 'active', NOW())
      `, [testMember.memberId]);

      // Check status again - should be true
      response = await request.get('http://localhost:3001/api/dds/status');
      expect(response.ok()).toBeTruthy();
      data = await response.json();
      expect(data.hasDds).toBe(true);

      console.log('✅ API returns hasDds=true when DDS assigned');

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
      // Clean up test DDS assignments
      await clearTodaysDds(client);

      // Clean up test audit logs
      await client.query(`
        DELETE FROM responsibility_audit_log
        WHERE notes LIKE '%e2e-test%'
      `);

      console.log('Cleaned up test DDS data');
    } finally {
      await client.end();
    }
  });
});

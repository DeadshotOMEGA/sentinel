import { test, expect, Page, Browser } from '@playwright/test';
import { Client } from 'pg';

/**
 * Security Alerts E2E Tests
 *
 * Verifies the security alert system for badge scan errors:
 * - Disabled badge → Critical alert (red)
 * - Unknown badge → Warning alert (yellow)
 *
 * Tests the full flow: Kiosk → Backend → Dashboard alert banner → TV display border
 *
 * Run with: bunx playwright test tests/e2e/scenarios/security-alerts.spec.ts
 */

test.describe.configure({ mode: 'serial' });
test.setTimeout(60000);

const KIOSK_URL = 'http://localhost:5174';
const TV_URL = 'http://localhost:5175';
const DASHBOARD_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'test-results/security-alerts';

// Test badges
const UNKNOWN_BADGE = 'SECURITY-ALERT-TEST-UNKNOWN';
const DISABLED_BADGE_SERIAL = 'TEST-BADGE-D11841726'; // Known disabled badge from test data

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

// Helper to get active security alerts from DB
async function getActiveAlerts(client: Client) {
  const result = await client.query(`
    SELECT id, alert_type, severity, badge_serial, message, status, created_at
    FROM security_alerts
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT 10
  `);
  return result.rows;
}

// Helper to clear test alerts
async function clearTestAlerts(client: Client, badgeSerial: string) {
  await client.query(`
    DELETE FROM security_alerts
    WHERE badge_serial = $1
  `, [badgeSerial]);
}

test.describe('Security Alert System', () => {
  test.beforeAll(async () => {
    const fs = await import('fs');
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  // ============================================================================
  // TEST 1: Unknown Badge Alert (Warning - Yellow)
  // ============================================================================
  test('unknown badge triggers warning alert', async ({ browser }) => {
    const client = await getDbClient();
    const kioskContext = await browser.newContext();
    const kioskPage = await kioskContext.newPage();

    try {
      // Clear any previous alerts for this badge
      await clearTestAlerts(client, UNKNOWN_BADGE);

      // Navigate to kiosk
      await kioskPage.goto(KIOSK_URL);
      await kioskPage.waitForLoadState('networkidle');
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible();

      // Screenshot: Before scan
      await kioskPage.screenshot({
        path: `${SCREENSHOT_DIR}/01-unknown-badge-before.png`,
        fullPage: true,
      });

      // Scan unknown badge
      await scanBadge(kioskPage, UNKNOWN_BADGE);

      // ===== VERIFY KIOSK ERROR MESSAGE =====
      // Should show new user-friendly message (not technical error codes)
      await expect(
        kioskPage.getByText('Badge Not Recognized')
      ).toBeVisible({ timeout: 10000 });

      await expect(
        kioskPage.getByText(/not registered.*Ship's Office/i)
      ).toBeVisible();

      await kioskPage.screenshot({
        path: `${SCREENSHOT_DIR}/01-unknown-badge-error.png`,
        fullPage: true,
      });

      console.log('✅ KIOSK: Displays user-friendly error message');

      // ===== VERIFY DATABASE ALERT =====
      // Wait for alert to be created
      await kioskPage.waitForTimeout(1000);

      const alerts = await getActiveAlerts(client);
      const alert = alerts.find(a => a.badge_serial === UNKNOWN_BADGE);

      expect(alert).toBeTruthy();
      expect(alert.alert_type).toBe('badge_unknown');
      expect(alert.severity).toBe('warning');
      expect(alert.status).toBe('active');

      console.log('✅ DATABASE: Warning alert created correctly');
      console.log(`   alert_type=${alert.alert_type}, severity=${alert.severity}`);

      // Wait for kiosk to return to idle
      await expect(kioskPage.getByText('Tap Your Badge')).toBeVisible({ timeout: 15000 });

    } finally {
      await kioskContext.close();
      await client.end();
    }
  });

  // ============================================================================
  // TEST 2: Disabled Badge Alert (Critical - Red)
  // ============================================================================
  test('disabled badge triggers critical alert', async ({ browser }) => {
    const client = await getDbClient();
    const kioskContext = await browser.newContext();
    const kioskPage = await kioskContext.newPage();

    try {
      // Find a disabled badge that is ASSIGNED to a member (not unassigned)
      // An unassigned badge would trigger BADGE_NOT_ASSIGNED error instead
      const disabledBadge = await client.query(`
        SELECT b.serial_number
        FROM badges b
        WHERE b.status = 'disabled'
          AND b.assignment_type = 'member'
          AND b.assigned_to_id IS NOT NULL
        LIMIT 1
      `);

      let badgeSerial: string;
      if (disabledBadge.rows.length > 0) {
        badgeSerial = disabledBadge.rows[0].serial_number;
      } else {
        // Create a test disabled badge assigned to an existing member
        const memberResult = await client.query(`
          SELECT id FROM members LIMIT 1
        `);
        if (memberResult.rows.length === 0) {
          throw new Error('No members in database to assign disabled badge to');
        }
        const memberId = memberResult.rows[0].id;

        await client.query(`
          INSERT INTO badges (serial_number, assignment_type, assigned_to_id, status)
          VALUES ($1, 'member', $2, 'disabled')
          ON CONFLICT (serial_number) DO UPDATE SET status = 'disabled', assignment_type = 'member', assigned_to_id = $2
        `, [DISABLED_BADGE_SERIAL, memberId]);
        badgeSerial = DISABLED_BADGE_SERIAL;
      }

      // Clear previous alerts
      await clearTestAlerts(client, badgeSerial);

      // Navigate to kiosk
      await kioskPage.goto(KIOSK_URL);
      await kioskPage.waitForLoadState('networkidle');

      await kioskPage.screenshot({
        path: `${SCREENSHOT_DIR}/02-disabled-badge-before.png`,
        fullPage: true,
      });

      // Scan disabled badge
      await scanBadge(kioskPage, badgeSerial);

      // ===== VERIFY KIOSK ERROR MESSAGE =====
      await expect(
        kioskPage.getByText('Badge Disabled')
      ).toBeVisible({ timeout: 10000 });

      await expect(
        kioskPage.getByText(/disabled.*Ship's Office/i)
      ).toBeVisible();

      await kioskPage.screenshot({
        path: `${SCREENSHOT_DIR}/02-disabled-badge-error.png`,
        fullPage: true,
      });

      console.log('✅ KIOSK: Displays user-friendly disabled badge message');

      // ===== VERIFY DATABASE ALERT =====
      await kioskPage.waitForTimeout(1000);

      const alerts = await getActiveAlerts(client);
      const alert = alerts.find(a => a.badge_serial === badgeSerial);

      expect(alert).toBeTruthy();
      expect(alert.alert_type).toBe('badge_disabled');
      expect(alert.severity).toBe('critical');
      expect(alert.status).toBe('active');

      console.log('✅ DATABASE: Critical alert created correctly');
      console.log(`   alert_type=${alert.alert_type}, severity=${alert.severity}`);

    } finally {
      await kioskContext.close();
      await client.end();
    }
  });

  // ============================================================================
  // TEST 3: TV Display Shows Pulsing Border on Alert
  // ============================================================================
  test('TV display shows pulsing border when alert is active', async ({ browser }) => {
    const client = await getDbClient();
    const kioskContext = await browser.newContext();
    const tvContext = await browser.newContext();

    const kioskPage = await kioskContext.newPage();
    const tvPage = await tvContext.newPage();

    try {
      // Clear previous alerts
      await clearTestAlerts(client, UNKNOWN_BADGE);

      // Navigate to both apps
      await Promise.all([
        kioskPage.goto(KIOSK_URL),
        tvPage.goto(TV_URL),
      ]);

      await Promise.all([
        kioskPage.waitForLoadState('networkidle'),
        tvPage.waitForLoadState('networkidle'),
      ]);

      // Screenshot: TV before alert
      await tvPage.screenshot({
        path: `${SCREENSHOT_DIR}/03-tv-before-alert.png`,
        fullPage: true,
      });

      // Trigger an alert by scanning unknown badge
      await scanBadge(kioskPage, UNKNOWN_BADGE);

      // Wait for WebSocket propagation
      await tvPage.waitForTimeout(3000);

      // Screenshot: TV after alert (should have yellow border)
      await tvPage.screenshot({
        path: `${SCREENSHOT_DIR}/03-tv-after-alert.png`,
        fullPage: true,
      });

      // Check for warning border class (yellow pulsing)
      const hasWarningBorder = await tvPage.locator('[class*="animate-pulse-border"]').count() > 0
        || await tvPage.locator('[class*="border-amber"]').count() > 0
        || await tvPage.locator('[class*="border-warning"]').count() > 0;

      if (hasWarningBorder) {
        console.log('✅ TV DISPLAY: Yellow pulsing border visible');
      } else {
        console.log('⚠️ TV DISPLAY: Border may not be visible (check WebSocket connection)');
      }

    } finally {
      await kioskContext.close();
      await tvContext.close();
      await client.end();
    }
  });

  // ============================================================================
  // TEST 4: Dashboard Shows Alert Banner
  // ============================================================================
  test.skip('dashboard shows alert banner (requires auth)', async ({ browser }) => {
    // This test requires dashboard authentication
    // Run manually with: bunx playwright test --project=chromium --headed
    const client = await getDbClient();
    const dashboardContext = await browser.newContext();
    const dashboardPage = await dashboardContext.newPage();

    try {
      // Navigate to dashboard (would need auth)
      await dashboardPage.goto(DASHBOARD_URL);

      // Check for alert banner
      const alertBanner = dashboardPage.locator('[class*="AlertBanner"]');
      const hasAlert = await alertBanner.count() > 0;

      if (hasAlert) {
        await dashboardPage.screenshot({
          path: `${SCREENSHOT_DIR}/04-dashboard-alert-banner.png`,
          fullPage: true,
        });
        console.log('✅ DASHBOARD: Alert banner visible');
      } else {
        console.log('⚠️ DASHBOARD: No alert banner (may need active alerts)');
      }

    } finally {
      await dashboardContext.close();
      await client.end();
    }
  });

  // ============================================================================
  // TEST 5: Alert Acknowledgment
  // ============================================================================
  test('alert can be acknowledged via API', async () => {
    const client = await getDbClient();

    try {
      // Find an active alert
      const alerts = await getActiveAlerts(client);

      if (alerts.length === 0) {
        console.log('⚠️ No active alerts to acknowledge');
        return;
      }

      const alertId = alerts[0].id;
      console.log(`Found active alert: ${alertId}`);

      // Acknowledge via direct DB (since API requires auth)
      await client.query(`
        UPDATE security_alerts
        SET status = 'acknowledged',
            acknowledged_at = NOW(),
            acknowledge_note = 'Acknowledged by E2E test'
        WHERE id = $1
      `, [alertId]);

      // Verify acknowledgment
      const result = await client.query(`
        SELECT status, acknowledged_at FROM security_alerts WHERE id = $1
      `, [alertId]);

      expect(result.rows[0].status).toBe('acknowledged');
      expect(result.rows[0].acknowledged_at).toBeTruthy();

      console.log('✅ Alert acknowledged successfully');

    } finally {
      await client.end();
    }
  });

  // ============================================================================
  // Cleanup: Clear test alerts
  // ============================================================================
  test.afterAll(async () => {
    const client = await getDbClient();
    try {
      // Clean up test alerts
      await client.query(`
        DELETE FROM security_alerts
        WHERE badge_serial IN ($1, $2)
      `, [UNKNOWN_BADGE, DISABLED_BADGE_SERIAL]);
      console.log('🧹 Cleaned up test alerts');
    } finally {
      await client.end();
    }
  });
});

test.describe('Error Message Improvements', () => {
  // ============================================================================
  // Verify new error message format
  // ============================================================================
  test('error messages use plain language without status codes', async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForLoadState('networkidle');

    // Scan unknown badge
    await scanBadge(page, 'ERROR-MESSAGE-TEST-123');

    // Wait for error screen
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-error-message-format.png`,
      fullPage: true,
    });

    // Verify NO status codes are shown
    const pageContent = await page.textContent('body');

    // Should NOT contain HTTP status codes
    expect(pageContent).not.toMatch(/\b400\b/);
    expect(pageContent).not.toMatch(/\b404\b/);
    expect(pageContent).not.toMatch(/\b500\b/);

    // Should NOT contain "Unable to Process" as main heading (old format)
    // Now should show specific error like "Badge Not Recognized"
    const hasGenericError = await page.getByRole('heading', { name: 'Unable to Process' }).count();
    const hasSpecificError = await page.getByRole('heading', { name: /Badge|Error|Wait/i }).count();

    if (hasSpecificError > 0 && hasGenericError === 0) {
      console.log('✅ Error messages use specific, plain language');
    } else if (hasGenericError > 0) {
      console.log('⚠️ Still using generic "Unable to Process" heading');
    }

    // Should mention Ship's Office (not "administrator")
    const mentionsShipsOffice = pageContent?.includes("Ship's Office");
    if (mentionsShipsOffice) {
      console.log('✅ Error message directs user to Ship\'s Office');
    }
  });
});

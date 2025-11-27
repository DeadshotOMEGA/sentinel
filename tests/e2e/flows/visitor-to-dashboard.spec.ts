import { test, expect } from '@playwright/test';

test.describe('Visitor Check-in Flow', () => {
  test('visitor check-in at kiosk appears on admin dashboard', async ({ browser }) => {
    // Create separate contexts for kiosk and admin
    const kioskContext = await browser.newContext();
    const adminContext = await browser.newContext();

    const kioskPage = await kioskContext.newPage();
    const adminPage = await adminContext.newPage();

    const visitorName = `Test Visitor ${Date.now()}`;

    // Step 1: Admin opens dashboard and notes current state
    await adminPage.goto('http://localhost:5173');
    // Wait for dashboard to load
    await adminPage.waitForLoadState('networkidle');

    // Step 2: Visitor checks in at kiosk
    await kioskPage.goto('http://localhost:5174');
    await kioskPage.getByRole('button', { name: /visitor/i }).click();
    await kioskPage.getByLabel(/name/i).fill(visitorName);
    await kioskPage.getByRole('button', { name: /submit|check.?in|continue/i }).click();

    // Wait for success on kiosk
    await expect(kioskPage.getByText(/welcome|success|checked/i)).toBeVisible({ timeout: 5000 });

    // Step 3: Verify visitor appears on admin dashboard (via WebSocket update)
    // May need to navigate to visitors section or wait for real-time update
    await expect(adminPage.getByText(visitorName)).toBeVisible({ timeout: 10000 });

    // Cleanup
    await kioskContext.close();
    await adminContext.close();
  });
});

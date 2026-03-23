import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const SCREENSHOT_DIR = 'test-results/e2e/frontend/dashboard-status-actions'
mkdirSync(SCREENSHOT_DIR, { recursive: true })

test.describe('Dashboard status actions cell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('h1')
  })

  test('shows lockup and transfer controls in a dedicated status stat', async ({ page }) => {
    const statusStats = page.locator('[data-help-id="dashboard.status-stats"]')
    await expect(statusStats).toBeVisible()

    const actionsStat = page.locator('[data-help-id="dashboard.stat.actions"]')
    await expect(actionsStat).toBeVisible()

    const actionButtons = actionsStat.getByRole('button')
    const buttonCount = await actionButtons.count()
    expect(buttonCount).toBeGreaterThanOrEqual(2)

    await expect(actionButtons.nth(0)).toHaveText(/open building|execute lockup/i)
    await expect(actionButtons.nth(1)).toHaveText(/transfer dds/i)

    const transferLockup = actionsStat.getByRole('button', { name: /transfer lockup/i })
    if ((await transferLockup.count()) > 0) {
      await expect(actionButtons.nth(2)).toHaveText(/transfer lockup/i)
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/status-actions-cell.png`, fullPage: true })
  })
})
